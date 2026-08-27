import uuid
import os
import io
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models import User, FileItem, Folder, ShareLink, UserShare, ActivityLog
from backend.schemas import ShareLinkCreate, ShareLinkResponse, UserShareCreate, UserShareResponse
from backend.auth import get_current_user, get_password_hash, verify_password
from backend.crypto_utils import (
    decrypt_data_aes,
    rsa_decrypt_dek,
    rsa_encrypt_dek,
    decrypt_user_private_key
)


router = APIRouter(prefix="/api/shares", tags=["Shares"])

# ---------------------------------------------------------
# 1. User-to-User Direct Sharing & Revocation Engine
# ---------------------------------------------------------

@router.post("/user", response_model=UserShareResponse, status_code=status.HTTP_201_CREATED)
async def share_file_with_user(
    share_in: UserShareCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    file_res = await db.execute(
        select(FileItem).where(FileItem.id == share_in.file_id, FileItem.user_id == current_user.id)
    )
    file_item = file_res.scalar_one_or_none()
    if not file_item:
        raise HTTPException(status_code=404, detail="File not found or access denied.")

    recipient_res = await db.execute(select(User).where(User.email == share_in.recipient_email))
    recipient = recipient_res.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=404, detail=f"Recipient user '{share_in.recipient_email}' not found.")

    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot share file with yourself.")

    existing_share_res = await db.execute(
        select(UserShare).where(
            UserShare.file_id == file_item.id,
            UserShare.recipient_id == recipient.id,
            UserShare.is_revoked == False
        )
    )
    if existing_share_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"File is already shared with {recipient.email}.")

    owner_priv_key = decrypt_user_private_key(current_user.encrypted_private_key_pem, current_user.id)
    file_dek = rsa_decrypt_dek(file_item.encrypted_dek, owner_priv_key)
    encrypted_dek_for_recipient = rsa_encrypt_dek(file_dek, recipient.public_key_pem)


    user_share = UserShare(
        file_id=file_item.id,
        owner_id=current_user.id,
        recipient_id=recipient.id,
        encrypted_dek_for_recipient=encrypted_dek_for_recipient,
        is_revoked=False
    )
    db.add(user_share)

    activity = ActivityLog(
        user_id=current_user.id,
        action_type="SHARE_WITH_USER",
        description=f"Shared file '{file_item.original_name}' with {recipient.email} (RSA DEK Re-encrypted)."
    )
    db.add(activity)
    await db.commit()
    await db.refresh(user_share)

    return UserShareResponse(
        id=user_share.id,
        file_id=file_item.id,
        owner_id=current_user.id,
        recipient_id=recipient.id,
        recipient_email=recipient.email,
        is_revoked=False,
        created_at=user_share.created_at,
        file_info={
            "id": file_item.id,
            "original_name": file_item.original_name,
            "mime_type": file_item.mime_type,
            "file_size": file_item.file_size
        }
    )

@router.get("/shared-with-me", response_model=List[UserShareResponse])
async def list_shared_with_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(UserShare, FileItem, User)
        .join(FileItem, UserShare.file_id == FileItem.id)
        .join(User, UserShare.owner_id == User.id)
        .where(
            UserShare.recipient_id == current_user.id,
            UserShare.is_revoked == False
        )
    )
    rows = res.all()

    result_list = []
    for share, file_item, owner in rows:
        result_list.append(UserShareResponse(
            id=share.id,
            file_id=file_item.id,
            owner_id=owner.id,
            recipient_id=current_user.id,
            recipient_email=current_user.email,
            is_revoked=share.is_revoked,
            created_at=share.created_at,
            file_info={
                "id": file_item.id,
                "original_name": file_item.original_name,
                "mime_type": file_item.mime_type,
                "file_size": file_item.file_size,
                "owner_email": owner.email,
                "owner_name": owner.full_name
            }
        ))
    return result_list

@router.get("/my-shares", response_model=List[UserShareResponse])
async def list_my_outgoing_shares(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(UserShare, FileItem, User)
        .join(FileItem, UserShare.file_id == FileItem.id)
        .join(User, UserShare.recipient_id == User.id)
        .where(UserShare.owner_id == current_user.id)
    )
    rows = res.all()

    result_list = []
    for share, file_item, recipient in rows:
        result_list.append(UserShareResponse(
            id=share.id,
            file_id=file_item.id,
            owner_id=current_user.id,
            recipient_id=recipient.id,
            recipient_email=recipient.email,
            is_revoked=share.is_revoked,
            created_at=share.created_at,
            file_info={
                "id": file_item.id,
                "original_name": file_item.original_name,
                "mime_type": file_item.mime_type,
                "file_size": file_item.file_size
            }
        ))
    return result_list

@router.patch("/revoke/{share_id}")
async def revoke_user_share(
    share_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(UserShare).where(UserShare.id == share_id, UserShare.owner_id == current_user.id)
    )
    share = res.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Share record not found or unauthorized.")

    share.is_revoked = True
    
    activity = ActivityLog(
        user_id=current_user.id,
        action_type="REVOKE_SHARE",
        description=f"Revoked access for share record '{share_id}'."
    )
    db.add(activity)
    await db.commit()

    return {"message": "Access revoked successfully.", "is_revoked": True}

@router.get("/shared-file/{file_id}/download")
async def download_user_shared_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # SERVER-SIDE REVOCATION ENFORCEMENT
    share_res = await db.execute(
        select(UserShare).where(
            UserShare.file_id == file_id,
            UserShare.recipient_id == current_user.id
        )
    )
    user_share = share_res.scalar_one_or_none()
    
    if not user_share or user_share.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Share has been revoked by the owner or access permission does not exist."
        )

    file_res = await db.execute(select(FileItem).where(FileItem.id == file_id))
    file_item = file_res.scalar_one_or_none()
    if not file_item or not os.path.exists(file_item.storage_path):
        raise HTTPException(status_code=404, detail="File resource not found on server.")

    with open(file_item.storage_path, "rb") as f:
        file_bytes = f.read()

    recipient_priv_key = decrypt_user_private_key(current_user.encrypted_private_key_pem, current_user.id)
    file_dek = rsa_decrypt_dek(user_share.encrypted_dek_for_recipient, recipient_priv_key)
    decrypted_bytes = decrypt_data_aes(file_bytes, file_dek)


    activity = ActivityLog(
        user_id=current_user.id,
        action_type="DOWNLOAD_SHARED",
        description=f"Downloaded shared file '{file_item.original_name}' (Hybrid Decryption)."
    )
    db.add(activity)
    await db.commit()

    return StreamingResponse(
        io.BytesIO(decrypted_bytes),
        media_type=file_item.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{file_item.original_name}"'}
    )


# ---------------------------------------------------------
# 2. Anonymous / Link-based Expirable Sharing
# ---------------------------------------------------------

@router.post("/create", response_model=ShareLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_share_link(
    share_in: ShareLinkCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not share_in.file_id and not share_in.folder_id:
        raise HTTPException(status_code=400, detail="Must specify either file_id or folder_id to share.")

    expires_at = None
    if share_in.expires_in_hours:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=share_in.expires_in_hours)

    share_code = uuid.uuid4().hex[:12]
    password_hash = get_password_hash(share_in.password) if share_in.password else None

    share_link = ShareLink(
        file_id=share_in.file_id,
        folder_id=share_in.folder_id,
        share_code=share_code,
        access_password_hash=password_hash,
        expires_at=expires_at,
        allow_download=share_in.allow_download,
        max_downloads=share_in.max_downloads
    )
    db.add(share_link)

    activity = ActivityLog(
        user_id=current_user.id,
        action_type="CREATE_SHARE_LINK",
        description=f"Created share link '{share_code}'."
    )
    db.add(activity)
    await db.commit()
    await db.refresh(share_link)
    return share_link

def _is_expired(expires_at: Optional[datetime]) -> bool:
    if not expires_at:
        return False
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < datetime.now(timezone.utc)

@router.get("/{share_code}")
async def inspect_share_link(share_code: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ShareLink).where(ShareLink.share_code == share_code))
    share = res.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found or expired.")

    if _is_expired(share.expires_at):
        raise HTTPException(status_code=410, detail="Share link has expired.")

    if share.max_downloads and share.access_count >= share.max_downloads:
        raise HTTPException(status_code=410, detail="Download limit reached for this share link.")

    requires_password = share.access_password_hash is not None

    file_info = None
    if share.file_id:
        f_res = await db.execute(select(FileItem).where(FileItem.id == share.file_id))
        file_item = f_res.scalar_one_or_none()
        if file_item:
            file_info = {
                "id": file_item.id,
                "name": file_item.original_name,
                "mime_type": file_item.mime_type,
                "size": file_item.file_size
            }

    return {
        "share_code": share.share_code,
        "requires_password": requires_password,
        "allow_download": share.allow_download,
        "expires_at": share.expires_at,
        "file_info": file_info
    }

@router.get("/{share_code}/download")
async def download_shared_file(
    share_code: str,
    password: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(ShareLink).where(ShareLink.share_code == share_code))
    share = res.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found.")

    if share.access_password_hash:
        if not password or not verify_password(password, share.access_password_hash):
            raise HTTPException(status_code=401, detail="Password required or invalid password.")

    if _is_expired(share.expires_at):
        raise HTTPException(status_code=410, detail="Share link has expired.")

    if share.max_downloads and share.access_count >= share.max_downloads:
        raise HTTPException(status_code=410, detail="Download limit reached.")


    f_res = await db.execute(select(FileItem).where(FileItem.id == share.file_id))
    file_item = f_res.scalar_one_or_none()
    if not file_item or not os.path.exists(file_item.storage_path):
        raise HTTPException(status_code=404, detail="Shared file resource not available.")

    owner_res = await db.execute(select(User).where(User.id == file_item.user_id))
    owner = owner_res.scalar_one_or_none()

    with open(file_item.storage_path, "rb") as f:
        file_bytes = f.read()

    if file_item.is_encrypted:
        owner_priv_key = decrypt_user_private_key(owner.encrypted_private_key_pem, owner.id)
        file_dek = rsa_decrypt_dek(file_item.encrypted_dek, owner_priv_key)
        decrypted_bytes = decrypt_data_aes(file_bytes, file_dek)
    else:

        decrypted_bytes = file_bytes

    share.access_count += 1
    await db.commit()

    return StreamingResponse(
        io.BytesIO(decrypted_bytes),
        media_type=file_item.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{file_item.original_name}"'}
    )
