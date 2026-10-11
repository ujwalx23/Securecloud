import uuid
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, delete, desc

import re
import httpx
from backend.config import GOOGLE_CLIENT_ID
from backend.database import get_db
from backend.models import User, ActivityLog, UserSession, SecurityAuditLog
from backend.schemas import (
    UserRegister,
    UserLogin,
    GoogleLoginRequest,
    Token,
    UserResponse,
    VerifyEmailRequest,
    ResendCodeRequest,
    UserProfileUpdate,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    SessionResponse
)
from backend.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    create_user_session
)
from backend.crypto_utils import generate_rsa_keypair, encrypt_user_private_key
from backend.rate_limiter import login_rate_limiter
from backend.email_service import generate_verification_code, send_verification_email
from backend.storage_allocation import assign_initial_storage_or_queue, release_slot_and_promote_next

router = APIRouter(prefix="/api/auth", tags=["Auth"])

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserRegister, request: Request, db: AsyncSession = Depends(get_db)):
    clean_email = user_in.email.strip().lower()
    clean_username = user_in.username.strip().lower()

    if len(user_in.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    # Check for username collision
    user_by_uname = await db.execute(select(User).where(User.username == clean_username))
    existing_by_uname = user_by_uname.scalar_one_or_none()
    if existing_by_uname and existing_by_uname.email != clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{clean_username}' is already taken. Please choose another."
        )

    # Check for email collision
    result = await db.execute(select(User).where(User.email == clean_email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        if existing_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address already registered. Please sign in."
            )
        else:
            # Unverified account re-registering: refresh credentials and OTP
            existing_user.username = clean_username
            existing_user.hashed_password = get_password_hash(user_in.password)
            if user_in.full_name:
                existing_user.full_name = user_in.full_name

            verification_code = generate_verification_code()
            existing_user.verification_code = verification_code
            existing_user.verification_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

            activity = ActivityLog(
                user_id=existing_user.id,
                action_type="UNVERIFIED_REREGISTER",
                description="Unverified account re-registered. Fresh verification OTP sent.",
                ip_address=get_client_ip(request)
            )
            db.add(activity)
            await db.commit()
            await db.refresh(existing_user)

            await send_verification_email(clean_email, verification_code, existing_user.full_name)
            return existing_user

    # Hybrid Cryptography: Generate RSA-2048 Asymmetric Keypair
    user_id = str(uuid.uuid4())
    public_pem, private_pem = generate_rsa_keypair()
    encrypted_priv_key = encrypt_user_private_key(private_pem, user_id)

    # Generate 6-digit Email Verification OTP
    verification_code = generate_verification_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    user = User(
        id=user_id,
        email=clean_email,
        username=clean_username,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name or clean_username,
        public_key_pem=public_pem,
        encrypted_private_key_pem=encrypted_priv_key,
        is_verified=False,
        verification_code=verification_code,
        verification_expires_at=expires_at,
        plan_type="basic",
        storage_quota_bytes=0,
        text_storage_quota_bytes=1048576  # 1 MB safe personal text buffer
    )
    db.add(user)
    await db.flush()

    activity = ActivityLog(
        user_id=user.id,
        action_type="HYBRID_REGISTER",
        description="Account registered with unique username and RSA-2048 keypair. Verification OTP sent.",
        ip_address=get_client_ip(request)
    )
    db.add(activity)
    await db.commit()
    await db.refresh(user)

    await send_verification_email(clean_email, verification_code, user.full_name)
    return user


@router.post("/verify-email")
async def verify_email(data: VerifyEmailRequest, request: Request, db: AsyncSession = Depends(get_db)):
    clean_email = data.email.strip().lower()
    result = await db.execute(select(User).where(User.email == clean_email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    if user.is_verified:
        return {"message": "Email is already verified. You can log in.", "verified": True}

    if not user.verification_code or user.verification_code != data.code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit verification code. Please check your email."
        )

    now = datetime.now(timezone.utc)
    expires_at = user.verification_expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at and now > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code."
        )

    user.is_verified = True
    user.verification_code = None
    user.verification_expires_at = None

    # Promotional Allocation System: Attempt to claim one of 10 promotional slots, or join queue
    plan_assigned, slot_or_pos = await assign_initial_storage_or_queue(db, user)

    activity = ActivityLog(
        user_id=user.id,
        action_type="EMAIL_VERIFIED",
        description=f"Account verified. Allocation: {plan_assigned.upper()} (Slot/Queue #{slot_or_pos}).",
        ip_address=get_client_ip(request)
    )
    db.add(activity)
    await db.commit()
    await db.refresh(user)

    msg = f"Email verified successfully! You have been granted {plan_assigned} plan."
    if plan_assigned == "premium":
        msg += f" Promotional Premium Slot #{slot_or_pos} (1,000 MB) is active."
    else:
        msg += f" You are at queue position #{slot_or_pos} for automatic promotional upgrade."

    return {"message": msg, "verified": True, "plan": plan_assigned, "slot_or_queue": slot_or_pos}


@router.post("/resend-code")
async def resend_verification_code(data: ResendCodeRequest, db: AsyncSession = Depends(get_db)):
    clean_email = data.email.strip().lower()
    result = await db.execute(select(User).where(User.email == clean_email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    if user.is_verified:
        return {"message": "Email is already verified.", "verified": True}

    new_code = generate_verification_code()
    user.verification_code = new_code
    user.verification_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    await db.commit()

    await send_verification_email(clean_email, new_code, user.full_name)
    return {"message": "A fresh 6-digit verification code has been dispatched to your email."}


@router.post("/login", response_model=Token)
async def login_user(credentials: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    clean_login = credentials.login.strip().lower()
    ip_addr = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "Unknown Browser")

    # 1. Enforce brute-force rate limit check
    login_rate_limiter.check(request, clean_login)

    # 2. Query user by email OR username
    result = await db.execute(
        select(User).where(
            or_(User.email == clean_login, User.username == clean_login)
        )
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(credentials.password, user.hashed_password):
        login_rate_limiter.record_failure(request, clean_login)
        audit = SecurityAuditLog(
            user_id=user.id if user else None,
            action_type="FAILED_LOGIN_ATTEMPT",
            description=f"Failed login attempt for identifier: {clean_login}",
            ip_address=ip_addr,
            user_agent=user_agent
        )
        db.add(audit)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify email/username and password."
        )

    # 3. Check account active status
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been suspended by an administrator."
        )

    # 4. Check if verified
    if not user.is_verified:
        now = datetime.now(timezone.utc)
        expires_at = user.verification_expires_at
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if not user.verification_code or (expires_at and now > expires_at):
            user.verification_code = generate_verification_code()
            user.verification_expires_at = now + timedelta(minutes=15)
            await db.commit()

        await send_verification_email(user.email, user.verification_code, user.full_name)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required. A fresh OTP has been dispatched to your email."
        )

    # 5. Clear rate limiter
    login_rate_limiter.record_success(request, clean_login)

    # 6. Issue JWT Token & Register UserSession
    access_token = create_access_token(data={"sub": user.id, "email": user.email, "username": user.username})
    await create_user_session(db, user.id, access_token, ip_addr, user_agent)

    user.online_status = True
    user.last_active_at = datetime.now(timezone.utc)

    activity = ActivityLog(
        user_id=user.id,
        action_type="LOGIN",
        description="User logged in securely.",
        ip_address=ip_addr
    )
    db.add(activity)

    audit = SecurityAuditLog(
        user_id=user.id,
        action_type="USER_LOGIN",
        description="Authenticated session established.",
        ip_address=ip_addr,
        user_agent=user_agent
    )
    db.add(audit)
    await db.commit()
    await db.refresh(user)

    user_dict = {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
        "plan_type": user.plan_type,
        "is_promotional_premium": user.is_promotional_premium,
        "storage_quota_bytes": user.storage_quota_bytes,
        "storage_used_bytes": user.storage_used_bytes,
        "text_storage_quota_bytes": user.text_storage_quota_bytes,
        "text_storage_used_bytes": user.text_storage_used_bytes,
        "queue_position": user.queue_position,
        "is_admin": user.is_admin,
        "is_verified": user.is_verified
    }

    return {"access_token": access_token, "token_type": "bearer", "user": user_dict}


@router.post("/google", response_model=Token)
async def google_login(
    data: GoogleLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    ip_addr = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "Unknown Browser")
    token_str = data.credential.strip()

    # 1. Verify token with Google Tokeninfo API
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token_str}")
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired Google credential."
                )
            google_info = resp.json()
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to reach Google OAuth service. Please try again."
        )

    email = google_info.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google account has no email address.")

    name = google_info.get("name", "")
    picture = google_info.get("picture", "")

    # 2. Check if user already exists
    user_res = await db.execute(select(User).where(User.email == email))
    user = user_res.scalar_one_or_none()

    if user:
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been suspended.")

        if not user.username:
            base_u = re.sub(r"[^a-zA-Z0-9_]", "", email.split("@")[0].lower())[:20]
            user.username = base_u if len(base_u) >= 3 else f"user_{base_u}"

        # If user registered before with password but was unverified, Google email is authoritative!
        if not user.is_verified:
            user.is_verified = True
            user.verification_code = None
            user.verification_expires_at = None
            await assign_initial_storage_or_queue(db, user)

        if picture and not user.avatar_url:
            user.avatar_url = picture
    else:
        # First-time Google user: Create new account with RSA-2048 keys and unique username
        base_username = re.sub(r"[^a-zA-Z0-9_]", "", email.split("@")[0].lower())[:20]
        if len(base_username) < 3:
            base_username = f"user_{base_username}"

        username_candidate = base_username
        suffix = 1
        while True:
            u_check = await db.execute(select(User).where(User.username == username_candidate))
            if not u_check.scalar_one_or_none():
                break
            username_candidate = f"{base_username}_{suffix}"
            suffix += 1

        user_id = str(uuid.uuid4())
        public_pem, private_pem = generate_rsa_keypair()
        encrypted_priv_key = encrypt_user_private_key(private_pem, user_id)

        user = User(
            id=user_id,
            email=email,
            username=username_candidate,
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            full_name=name or username_candidate,
            avatar_url=picture or None,
            public_key_pem=public_pem,
            encrypted_private_key_pem=encrypted_priv_key,
            is_verified=True,
            plan_type="basic",
            storage_quota_bytes=0,
            text_storage_quota_bytes=1048576
        )
        db.add(user)
        await db.flush()

        # Promotional Allocation: Slot 1-10 or Queue
        await assign_initial_storage_or_queue(db, user)

    user.online_status = True
    user.last_active_at = datetime.now(timezone.utc)

    # Issue access token & session
    access_token = create_access_token(data={"sub": user.id, "email": user.email, "username": user.username})
    await create_user_session(db, user.id, access_token, ip_addr, user_agent)

    activity = ActivityLog(
        user_id=user.id,
        action_type="GOOGLE_LOGIN",
        description="Authenticated securely via Google Identity.",
        ip_address=ip_addr
    )
    db.add(activity)

    audit = SecurityAuditLog(
        user_id=user.id,
        action_type="GOOGLE_OAUTH_LOGIN",
        description="Google OAuth authentication verified by Google tokeninfo.",
        ip_address=ip_addr,
        user_agent=user_agent
    )
    db.add(audit)
    await db.commit()
    await db.refresh(user)

    user_dict = {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
        "plan_type": user.plan_type,
        "is_promotional_premium": user.is_promotional_premium,
        "storage_quota_bytes": user.storage_quota_bytes,
        "storage_used_bytes": user.storage_used_bytes,
        "text_storage_quota_bytes": user.text_storage_quota_bytes,
        "text_storage_used_bytes": user.text_storage_used_bytes,
        "queue_position": user.queue_position,
        "is_admin": user.is_admin,
        "is_verified": user.is_verified
    }

    return {"access_token": access_token, "token_type": "bearer", "user": user_dict}


@router.post("/logout")
async def logout_user(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Revoke session matching current bearer token
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "").strip()
    if token:
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        sess_res = await db.execute(
            select(UserSession).where(UserSession.token_hash == token_hash)
        )
        session = sess_res.scalar_one_or_none()
        if session:
            session.is_revoked = True

    current_user.online_status = False
    current_user.last_active_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Logged out successfully."}


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    update_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name.strip()
    if update_data.username is not None:
        clean_u = update_data.username.strip().lower()
        if not re.match(r"^[a-zA-Z0-9_]{3,30}$", clean_u):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username must be 3-30 characters using only letters, numbers, and underscores."
            )
        if clean_u != current_user.username:
            check_u = await db.execute(select(User).where(User.username == clean_u))
            if check_u.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Username '@{clean_u}' is already taken. Please choose another."
                )
            current_user.username = clean_u
    if update_data.bio is not None:
        current_user.bio = update_data.bio.strip()
    if update_data.avatar_url is not None:
        current_user.avatar_url = update_data.avatar_url.strip()
    if update_data.privacy_profile_public is not None:
        current_user.privacy_profile_public = update_data.privacy_profile_public
    if update_data.privacy_allow_messages_from is not None:
        if update_data.privacy_allow_messages_from in ["connections", "all"]:
            current_user.privacy_allow_messages_from = update_data.privacy_allow_messages_from

    current_user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password does not match."
        )

    current_user.hashed_password = get_password_hash(data.new_password)
    current_user.updated_at = datetime.now(timezone.utc)

    # Revoke all sessions on password change
    sess_res = await db.execute(
        select(UserSession).where(UserSession.user_id == current_user.id)
    )
    for sess in sess_res.scalars().all():
        sess.is_revoked = True

    activity = ActivityLog(
        user_id=current_user.id,
        action_type="PASSWORD_CHANGED",
        description="User password successfully changed. All active sessions invalidated."
    )
    db.add(activity)
    await db.commit()
    return {"message": "Password updated successfully. Please log in again."}


@router.get("/sessions", response_model=List[SessionResponse])
async def list_active_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    auth_header = request.headers.get("authorization", "")
    current_token = auth_header.replace("Bearer ", "").strip()
    current_token_hash = hashlib.sha256(current_token.encode('utf-8')).hexdigest() if current_token else None

    result = await db.execute(
        select(UserSession)
        .where(UserSession.user_id == current_user.id)
        .where(UserSession.is_revoked.is_(False))
        .where(UserSession.expires_at > datetime.now(timezone.utc))
        .order_by(desc(UserSession.created_at))
    )
    sessions = result.scalars().all()

    return [
        SessionResponse(
            id=s.id,
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            created_at=s.created_at,
            expires_at=s.expires_at,
            is_current=(s.token_hash == current_token_hash)
        )
        for s in sessions
    ]


@router.post("/sessions/{session_id}/revoke")
async def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sess_res = await db.execute(
        select(UserSession)
        .where(UserSession.id == session_id)
        .where(UserSession.user_id == current_user.id)
    )
    session = sess_res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    session.is_revoked = True
    await db.commit()
    return {"message": "Session revoked."}


@router.post("/sessions/revoke-all")
async def revoke_all_other_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    auth_header = request.headers.get("authorization", "")
    current_token = auth_header.replace("Bearer ", "").strip()
    current_token_hash = hashlib.sha256(current_token.encode('utf-8')).hexdigest() if current_token else None

    sess_res = await db.execute(
        select(UserSession)
        .where(UserSession.user_id == current_user.id)
        .where(UserSession.is_revoked.is_(False))
    )
    for s in sess_res.scalars().all():
        if s.token_hash != current_token_hash:
            s.is_revoked = True

    await db.commit()
    return {"message": "All other sessions revoked."}


@router.delete("/me")
async def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Free promotional slot and auto-promote next in line
    await release_slot_and_promote_next(db, current_user.id)

    # Delete user (cascades to files, sessions, docs, etc.)
    await db.delete(current_user)
    await db.commit()
    return {"message": "Account deleted permanently."}
