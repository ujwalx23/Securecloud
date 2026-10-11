import os
from pathlib import Path

# Automatically load .env if present
try:
    from dotenv import load_dotenv
    root_env = Path(__file__).resolve().parent.parent / ".env"
    backend_env = Path(__file__).resolve().parent / ".env"
    if root_env.exists():
        load_dotenv(root_env)
    elif backend_env.exists():
        load_dotenv(backend_env)
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{BASE_DIR}/cloudstorage.db")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "securecloud-super-secret-jwt-key-2026-encrypt-all")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 7)))  # 7 days
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

DEFAULT_STORAGE_QUOTA_BYTES = int(os.getenv("DEFAULT_STORAGE_QUOTA_BYTES", str(1 * 1024 * 1024 * 1024)))  # 1 GB per user (10 users x 1 GB = 10 GB)
MASTER_KEY_SALT = os.getenv("MASTER_KEY_SALT", "securecloud-static-salt-2026").encode()

# Cloud Storage Engine Configuration (Cloudflare R2 / AWS S3 / S3-compatible / Local)
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")  # "local", "s3", or "r2"
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "")        # For Cloudflare R2: https://<account_id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID = os.getenv("S3_ACCESS_KEY_ID", "")
S3_SECRET_ACCESS_KEY = os.getenv("S3_SECRET_ACCESS_KEY", "")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "")
S3_REGION_NAME = os.getenv("S3_REGION_NAME", "auto")
