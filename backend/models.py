import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, BigInteger, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base
from backend.config import DEFAULT_STORAGE_QUOTA_BYTES

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=True)
    
    # Asymmetric Cryptography Keys (RSA-2048 PKI)
    public_key_pem: Mapped[str] = mapped_column(Text, nullable=True)
    encrypted_private_key_pem: Mapped[str] = mapped_column(Text, nullable=True)

    storage_quota_bytes: Mapped[int] = mapped_column(BigInteger, default=DEFAULT_STORAGE_QUOTA_BYTES)
    storage_used_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    folders = relationship("Folder", back_populates="user", cascade="all, delete-orphan")
    files = relationship("FileItem", back_populates="user", cascade="all, delete-orphan")
    vault_secrets = relationship("VaultSecret", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_id: Mapped[str] = mapped_column(String(36), ForeignKey("folders.id"), nullable=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="#4f46e5")
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    is_trashed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="folders")
    files = relationship("FileItem", back_populates="folder", cascade="all, delete-orphan")
    children = relationship("Folder", cascade="all, delete-orphan")


class FileItem(Base):
    __tablename__ = "files"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    encrypted_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), default="application/octet-stream")
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    folder_id: Mapped[str] = mapped_column(String(36), ForeignKey("folders.id"), nullable=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Hybrid Cryptography Fields
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=True)
    encryption_algo: Mapped[str] = mapped_column(String(50), default="RSA-2048 + AES-256-GCM")
    encrypted_dek: Mapped[str] = mapped_column(Text, nullable=True)

    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    is_trashed: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="files")
    folder = relationship("Folder", back_populates="files")
    versions = relationship("FileVersion", back_populates="file", cascade="all, delete-orphan")
    shares = relationship("ShareLink", back_populates="file", cascade="all, delete-orphan")
    user_shares = relationship("UserShare", back_populates="file", cascade="all, delete-orphan")


class FileVersion(Base):
    __tablename__ = "file_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id: Mapped[str] = mapped_column(String(36), ForeignKey("files.id"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    encrypted_dek: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    file = relationship("FileItem", back_populates="versions")


class ShareLink(Base):
    __tablename__ = "share_links"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id: Mapped[str] = mapped_column(String(36), ForeignKey("files.id"), nullable=True)
    folder_id: Mapped[str] = mapped_column(String(36), ForeignKey("folders.id"), nullable=True)
    share_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    access_password_hash: Mapped[str] = mapped_column(String(255), nullable=True)
    encrypted_dek_for_share: Mapped[str] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    allow_download: Mapped[bool] = mapped_column(Boolean, default=True)
    max_downloads: Mapped[int] = mapped_column(Integer, nullable=True)
    access_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    file = relationship("FileItem", back_populates="shares")


class UserShare(Base):
    __tablename__ = "user_shares"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id: Mapped[str] = mapped_column(String(36), ForeignKey("files.id"), nullable=False)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    recipient_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    encrypted_dek_for_recipient: Mapped[str] = mapped_column(Text, nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    file = relationship("FileItem", back_populates="user_shares")
    owner = relationship("User", foreign_keys=[owner_id])
    recipient = relationship("User", foreign_keys=[recipient_id])


class VaultSecret(Base):
    __tablename__ = "vault_secrets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    encrypted_payload: Mapped[str] = mapped_column(Text, nullable=False)
    secret_type: Mapped[str] = mapped_column(String(50), default="password")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="vault_secrets")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(45), default="127.0.0.1")
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="activities")
