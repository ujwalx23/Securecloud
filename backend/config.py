import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{BASE_DIR}/cloudstorage.db")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "securecloud-super-secret-jwt-key-2026-encrypt-all")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

DEFAULT_STORAGE_QUOTA_BYTES = 15 * 1024 * 1024 * 1024  # 15 GB
MASTER_KEY_SALT = b"securecloud-static-salt-2026"
