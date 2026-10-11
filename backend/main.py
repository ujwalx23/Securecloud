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
