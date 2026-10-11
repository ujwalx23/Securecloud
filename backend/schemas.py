import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator

# User Auth & Profile Schemas
class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30, description="Unique username (3-30 chars, alphanumeric & underscore)")
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    full_name: Optional[str] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        clean = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9_]{3,30}$", clean):
            raise ValueError("Username must be 3-30 characters and contain only letters, numbers, and underscores.")
        return clean

class UserLogin(BaseModel):
    login: str = Field(..., description="Email or Username")
    password: str

class GoogleLoginRequest(BaseModel):
    credential: str = Field(..., description="Google ID Token JWT from Google Identity Services")

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    privacy_profile_public: Optional[bool] = None
    privacy_allow_messages_from: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class SendPasswordOtpRequest(BaseModel):
    email: Optional[EmailStr] = None  # Optional if authenticated, required if unauthenticated

class SetPasswordWithOtpRequest(BaseModel):
    email: Optional[EmailStr] = None  # Optional if user is authenticated
    otp_code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")
    new_password: str = Field(..., min_length=8, description="New password at least 8 chars")

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str = Field(..., min_length=8)

class UserPublicProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    plan_type: str
    is_promotional_premium: bool
    created_at: datetime
    online_status: bool = False
    connection_status: Optional[str] = None  # "none", "pending_sent", "pending_received", "connected", "blocked"

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    username: str
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    storage_quota_bytes: int
    storage_used_bytes: int
    text_storage_quota_bytes: int
    text_storage_used_bytes: int
    plan_type: str
    is_promotional_premium: bool
    trial_started_at: Optional[datetime] = None
    trial_expires_at: Optional[datetime] = None
    subscription_expires_at: Optional[datetime] = None
    queue_position: Optional[int] = None
    queue_joined_at: Optional[datetime] = None
    privacy_profile_public: bool
    privacy_allow_messages_from: str
    online_status: bool
    is_verified: bool = False
    is_admin: bool = False
    dev_otp: Optional[str] = None
    created_at: datetime

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")

class ResendCodeRequest(BaseModel):
    email: EmailStr

# Session Management Schemas
class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    is_current: bool = False

# Text Documents Schemas
class TextDocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = ""
    is_pinned: bool = False

class TextDocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_favorite: Optional[bool] = None

class TextDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    content: str
    size_bytes: int
    is_pinned: bool
    is_favorite: bool
    created_at: datetime
    updated_at: datetime

# Communication Requests Schemas
class CommunicationRequestCreate(BaseModel):
    receiver_username: str
    note: Optional[str] = Field(None, max_length=255)

class CommunicationRequestAction(BaseModel):
    action: str = Field(..., description="'accept', 'reject', or 'block'")

class CommunicationRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sender_id: str
    receiver_id: str
    status: str
    note: Optional[str] = None
    created_at: datetime
    sender_username: Optional[str] = None
    sender_full_name: Optional[str] = None
    receiver_username: Optional[str] = None
    receiver_full_name: Optional[str] = None

# User Connections Schemas
class UserConnectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    connected_user_id: str
    connected_username: str
    connected_full_name: Optional[str] = None
    connected_avatar_url: Optional[str] = None
    connected_online_status: bool = False
    is_blocked: bool = False
    created_at: datetime

# Real-Time Chat Schemas
class ConversationCreate(BaseModel):
    recipient_id: str
    title: Optional[str] = None

class MessageSend(BaseModel):
    conversation_id: str
    content: str = Field(..., min_length=1, max_length=5000)
    attachment_file_id: Optional[str] = None

class MessageEdit(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)

class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    sender_id: str
    sender_username: Optional[str] = None
    sender_avatar_url: Optional[str] = None
    content: str
    is_edited: bool
    edited_at: Optional[datetime] = None
    is_deleted: bool
    attachment_file_id: Optional[str] = None
    attachment_info: Optional[Dict[str, Any]] = None
    created_at: datetime

class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: Optional[str] = None
    is_group: bool
    updated_at: datetime
    participants: List[Dict[str, Any]]
    last_message: Optional[Dict[str, Any]] = None
    unread_count: int = 0

# Notifications Schemas
class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    title: str
    content: str
    is_read: bool
    link: Optional[str] = None
    created_at: datetime

# Subscriptions & Allocations Schemas
class SubscriptionStatusResponse(BaseModel):
    current_plan: str
    is_promotional_premium: bool
    promotional_slot_number: Optional[int] = None
    queue_position: Optional[int] = None
    storage_quota_bytes: int
    storage_used_bytes: int
    text_storage_quota_bytes: int
    text_storage_used_bytes: int
    total_slots_claimed: int
    total_slots_available: int
    trial_started_at: Optional[datetime] = None
    trial_expires_at: Optional[datetime] = None
    has_used_trial: bool = False
    subscription_expires_at: Optional[datetime] = None
    custom_plan_contact: str = "ujwalsingh164@gmail.com"

class UpgradePlanRequest(BaseModel):
    plan_name: str = Field(..., description="'premium' or 'custom'")
    payment_id: Optional[str] = None
    order_id: Optional[str] = None

class StripeCheckoutRequest(BaseModel):
    card_number: Optional[str] = None
    exp_month: Optional[str] = None
    exp_year: Optional[str] = None
    cvc: Optional[str] = None
    name_on_card: Optional[str] = None
    postal_code: Optional[str] = None
    payment_method_id: Optional[str] = None

# Admin Schemas
class AdminOverviewResponse(BaseModel):
    total_users: int
    verified_users: int
    basic_users: int
    premium_users: int
    custom_users: int
    active_slots: int
    queue_length: int
    total_storage_allocated_bytes: int
    total_storage_used_bytes: int
    total_files: int = 0
    total_vault_items: int = 0
    total_documents: int = 0
    total_chats: int = 0
    total_shared_files: int = 0
    total_inquiries: int = 0
    pending_inquiries: int = 0
    active_otps_count: int = 0
    recent_audit_logs: List[Dict[str, Any]]

class AdminUserAction(BaseModel):
    action: str = Field(..., description="'suspend', 'activate', 'promote', 'demote'")

# Preserved Folder Schemas
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

# Preserved File Schemas
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

# Preserved Share Link Schemas
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

# Preserved User-to-User Share Schemas
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

# Preserved Vault Secret Schemas
class VaultSecretCreate(BaseModel):
    title: str
    secret_type: str = "password"
    payload: str

class VaultSecretResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    secret_type: str
    encrypted_payload: str
    created_at: datetime
    updated_at: datetime

# Preserved Activity Log Schema
class ActivityLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    action_type: str
    description: str
    ip_address: str
    timestamp: datetime

# Preserved Storage Stats Schema
class StorageStatsResponse(BaseModel):
    total_quota_bytes: int
    used_bytes: int
    available_bytes: int
    file_count: int
    folder_count: int
    category_breakdown: dict

# Contact Inquiries Schemas
class ContactInquiryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    category: str = "support"
    subject: Optional[str] = "Inquiry"
    message: str = Field(..., min_length=1, max_length=5000)

class ContactInquiryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    category: str
    subject: str
    message: str
    status: str
    admin_notes: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

class ContactInquiryStatusUpdate(BaseModel):
    status: str  # pending, in_progress, resolved, closed
    admin_notes: Optional[str] = None

class AdminQuotaUpdate(BaseModel):
    storage_quota_bytes: int

class AdminPasswordReset(BaseModel):
    new_password: str = Field(..., min_length=8)
