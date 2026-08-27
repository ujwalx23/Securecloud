import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from backend.database import init_db, AsyncSessionLocal
from backend.models import User, ActivityLog
from backend.auth import get_password_hash
from backend.crypto_utils import generate_rsa_keypair, encrypt_user_private_key
from backend.routes import auth_routes, folder_routes, file_routes, share_routes, vault_routes, stats_routes
import uuid

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database tables
    await init_db()
    
    # Create default demo user with Hybrid RSA-2048 keypair
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == "admin@securecloud.io"))
        demo_user = result.scalar_one_or_none()
        if not demo_user:
            admin_id = str(uuid.uuid4())
            pub_pem, priv_pem = generate_rsa_keypair()
            enc_priv_key = encrypt_user_private_key(priv_pem, admin_id)

            demo_user = User(
                id=admin_id,
                email="admin@securecloud.io",
                hashed_password=get_password_hash("Password123!"),
                full_name="Alex Mercer (Security Admin)",
                public_key_pem=pub_pem,
                encrypted_private_key_pem=enc_priv_key
            )
            session.add(demo_user)
            await session.flush()

            activity = ActivityLog(
                user_id=demo_user.id,
                action_type="SYSTEM_INIT",
                description="Demo account initialized with RSA-2048 + AES-256-GCM Hybrid Cryptographic Engine."
            )
            session.add(activity)
            await session.commit()
    yield

app = FastAPI(
    title="SecureCloud API",
    description="Enterprise-grade Hybrid Cryptographic Framework (RSA-2048 + AES-256-GCM) Secure Cloud Storage REST API",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(folder_routes.router)
app.include_router(file_routes.router)
app.include_router(share_routes.router)
app.include_router(vault_routes.router)
app.include_router(stats_routes.router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "SecureCloud Storage Engine",
        "version": "2.0.0",
        "security": "Hybrid Cryptographic Framework (RSA-2048 PKI + AES-256-GCM)"
    }

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
