import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import select

from backend.database import init_db, AsyncSessionLocal
from backend.models import User
from backend.routes import (
    auth_routes,
    folder_routes,
    file_routes,
    share_routes,
    vault_routes,
    stats_routes,
    user_routes,
    chat_routes,
    documents_routes,
    subscription_routes,
    notification_routes,
    admin_routes
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database tables
    await init_db()
    yield

app = FastAPI(
    title="SecureCloud Enterprise API",
    description="Enterprise-grade Cloud Platform with Hybrid Cryptography, Zero-Knowledge Storage, Real-Time Chat, Text Documents, and Subscription Infrastructure",
    version="2.0.0",
    lifespan=lifespan
)

# Phase 9: Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4173",
        "https://securecloud.vercel.app",
        "https://securexcloud.vercel.app",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Length", "X-Content-Type-Options"]
)

# Register All Routes
app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(chat_routes.router)
app.include_router(documents_routes.router)
app.include_router(subscription_routes.router)
app.include_router(notification_routes.router)
app.include_router(admin_routes.router)
app.include_router(folder_routes.router)
app.include_router(file_routes.router)
app.include_router(share_routes.router)
app.include_router(vault_routes.router)
app.include_router(stats_routes.router)

from backend.routes.admin_routes import submit_contact_inquiry
app.post("/api/contact/submit", status_code=201)(submit_contact_inquiry)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "SecureCloud Enterprise Platform",
        "version": "2.0.0",
        "security": "RSA-2048 PKI + AES-256-GCM Zero-Knowledge Storage & Audited Auth",
        "plans": {
            "basic": "Free (₹0)",
            "premium": "₹399/year (1 GB storage)",
            "custom": "Enterprise Direct (Contact: ujwalsingh164@gmail.com)"
        }
    }

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "SecureCloud API"}
