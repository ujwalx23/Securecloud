from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models import User, ActivityLog
from backend.schemas import UserRegister, UserLogin, Token, UserResponse
from backend.auth import get_password_hash, verify_password, create_access_token, get_current_user
from backend.crypto_utils import generate_rsa_keypair, encrypt_user_private_key
from backend.rate_limiter import login_rate_limiter
import uuid

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
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered."
        )

    # Hybrid Cryptography: Generate RSA-2048 Asymmetric Keypair
    user_id = str(uuid.uuid4())
    public_pem, private_pem = generate_rsa_keypair()
    encrypted_priv_key = encrypt_user_private_key(private_pem, user_id)

    user = User(
        id=user_id,
        email=clean_email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name or clean_email.split("@")[0].capitalize(),
        public_key_pem=public_pem,
        encrypted_private_key_pem=encrypted_priv_key
    )
    db.add(user)
    await db.flush()

    activity = ActivityLog(
        user_id=user.id,
        action_type="HYBRID_REGISTER",
        description="Account registered with unique RSA-2048 keypair generation."
    )
    db.add(activity)
    await db.commit()
    await db.refresh(user)

    return user

@router.post("/login", response_model=Token)
async def login_user(credentials: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    clean_email = credentials.email.strip().lower()

    # 1. Check rate limiter before checking password
    login_rate_limiter.check(request, clean_email)

    result = await db.execute(select(User).where(User.email == clean_email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(credentials.password, user.hashed_password):
        # 2. Record failure to track brute-force attacks
        login_rate_limiter.record_failure(request, clean_email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
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
