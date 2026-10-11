import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models import User, ActivityLog
from backend.schemas import (
    UserRegister,
    UserLogin,
    Token,
    UserResponse,
    VerifyEmailRequest,
    ResendCodeRequest
)
from backend.auth import get_password_hash, verify_password, create_access_token, get_current_user
from backend.crypto_utils import generate_rsa_keypair, encrypt_user_private_key
from backend.rate_limiter import login_rate_limiter
from backend.email_service import generate_verification_code, send_verification_email

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserRegister, db: AsyncSession = Depends(get_db)):
    clean_email = user_in.email.strip().lower()
    if len(user_in.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    result = await db.execute(select(User).where(User.email == clean_email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        if existing_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address already registered. Please sign in."
            )
        else:
            # User previously registered but didn't finish email verification.
            # Update password with their latest attempt, issue a fresh OTP, and send email!
            existing_user.hashed_password = get_password_hash(user_in.password)
            if user_in.full_name:
                existing_user.full_name = user_in.full_name

            verification_code = generate_verification_code()
            existing_user.verification_code = verification_code
            existing_user.verification_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

            activity = ActivityLog(
                user_id=existing_user.id,
                action_type="UNVERIFIED_REREGISTER",
                description="Unverified account re-registered. Fresh verification OTP sent."
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
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name or clean_email.split("@")[0].capitalize(),
        public_key_pem=public_pem,
        encrypted_private_key_pem=encrypted_priv_key,
        is_verified=False,
        verification_code=verification_code,
        verification_expires_at=expires_at
    )
    db.add(user)
    await db.flush()

    activity = ActivityLog(
        user_id=user.id,
        action_type="HYBRID_REGISTER",
        description="Account registered with unique RSA-2048 keypair generation. Verification OTP sent."
    )
    db.add(activity)
    await db.commit()
    await db.refresh(user)

    # Send verification email asynchronously
    await send_verification_email(clean_email, verification_code, user.full_name)

    return user

@router.post("/verify-email")
async def verify_email(data: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
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

    activity = ActivityLog(
        user_id=user.id,
        action_type="EMAIL_VERIFIED",
        description="Email address successfully verified via 6-digit cryptographic OTP."
    )
    db.add(activity)
    await db.commit()

    return {"message": "Email verified successfully! You may now log in.", "verified": True}

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
    clean_email = credentials.email.strip().lower()

    # 1. Enforce brute-force rate limit check
    login_rate_limiter.check(request, clean_email)

    result = await db.execute(select(User).where(User.email == clean_email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(credentials.password, user.hashed_password):
        login_rate_limiter.record_failure(request, clean_email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # 2. Check if email is verified
    if not user.is_verified:
        now = datetime.now(timezone.utc)
        expires_at = user.verification_expires_at
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        # Refresh code if expired or missing
        if not user.verification_code or (expires_at and now > expires_at):
            user.verification_code = generate_verification_code()
            user.verification_expires_at = now + timedelta(minutes=15)
            await db.commit()

        # Send fresh verification email to the user
        await send_verification_email(clean_email, user.verification_code, user.full_name)

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required. Please check your email for your 6-digit verification code."
        )

    # 3. Clear failed attempts on success
    login_rate_limiter.record_success(request, clean_email)

    access_token = create_access_token(data={"sub": user.id, "email": user.email})

    activity = ActivityLog(
        user_id=user.id,
        action_type="LOGIN",
        description="User logged in securely."
    )
    db.add(activity)
    await db.commit()

    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user
