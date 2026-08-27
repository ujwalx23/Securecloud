from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# User Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: Optional[str] = None
    storage_quota_bytes: int
    storage_used_bytes: int
    created_at: datetime

# Folder Schemas
class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None
    color: Optional[str] = "#4f46e5"

class FolderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    parent_id: Optional[str] = None
    color: str
    is_favorite: bool
    is_trashed: bool
    created_at: datetime

# File Schemas
class FileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    original_name: str
    mime_type: str
    file_size: int
    checksum_sha256: str
    folder_id: Optional[str] = None
    is_encrypted: bool
    encryption_algo: str
    is_favorite: bool
    is_trashed: bool
    version: int
    created_at: datetime
    updated_at: datetime

class FileVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    file_id: str
    version_number: int
    file_size: int
    checksum_sha256: str
    created_at: datetime

# Share Link Schemas
class ShareLinkCreate(BaseModel):
    file_id: Optional[str] = None
    folder_id: Optional[str] = None
    password: Optional[str] = None
    expires_in_hours: Optional[int] = None
    allow_download: bool = True
    max_downloads: Optional[int] = None

class ShareLinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    share_code: str
    file_id: Optional[str] = None
    folder_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    allow_download: bool
    access_count: int
    created_at: datetime

# User-to-User Share Schemas
class UserShareCreate(BaseModel):
    file_id: str
    recipient_email: EmailStr

class UserShareResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    file_id: str
    owner_id: str
    recipient_id: str
    recipient_email: str
    is_revoked: bool
    created_at: datetime
    file_info: Optional[Dict[str, Any]] = None

# Vault Secret Schemas
class VaultSecretCreate(BaseModel):
    title: str
    secret_type: str = "password"  # password, note, key
    payload: str  # Content to be encrypted

class VaultSecretResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    secret_type: str
    encrypted_payload: str
    created_at: datetime
    updated_at: datetime

# Activity Log Schema
class ActivityLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    action_type: str
    description: str
    ip_address: str
    timestamp: datetime

# Storage Stats Schema
class StorageStatsResponse(BaseModel):
    total_quota_bytes: int
    used_bytes: int
    available_bytes: int
    file_count: int
    folder_count: int
    category_breakdown: dict
