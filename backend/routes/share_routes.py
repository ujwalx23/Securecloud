import uuid
import os
import io
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc

from backend.database import get_db
from backend.storage_service import storage_service
from backend.models import User, FileItem, Folder, ShareLink, UserShare, ActivityLog, UserConnection
from backend.schemas import ShareLinkCreate, ShareLinkResponse, UserShareCreate, UserShareResponse
from backend.auth import get_current_user, get_password_hash, verify_password
from backend.crypto_utils import (
    decrypt_data_aes,
    rsa_decrypt_dek,
    rsa_encrypt_dek,
    decrypt_user_private_key
)

logger = logging.getLogger("securecloud.shares")
router = APIRouter(prefix="/api/shares", tags=["Shares"])

def pair_ids(id1: str, id2: str):
    return (min(id1, id2), max(id1, id2))

async def is_blocked_between(db: AsyncSession, user_a_id: str, user_b_id: str) -> bool:
    u_min, u_max = pair_ids(user_a_id, user_b_id)
    res = await db.execute(
        select(UserConnection).where(
            UserConnection.user_a_id == u_min,
            UserConnection.user_b_id == u_max,
            UserConnection.is_blocked.is_(True)
        )
    )
    return res.scalar_one_or_none() is not None

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

    recipient_res = await db.execute(select(User).where(User.email == share_in.recipient_email.strip().lower()))
    recipient = recipient_res.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=404, detail=f"Recipient user '{share_in.recipient_email}' not found.")

    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot share file with yourself.")

    # Enforce communication blocking check
    if await is_blocked_between(db, current_user.id, recipient.id):
        raise HTTPException(
            status_code=403,
            detail="Cannot share file. File sharing is blocked between these accounts."
        )

    existing_share_res = await db.execute(
        select(UserShare).where(
            UserShare.file_id == file_item.id,
            UserShare.recipient_id == recipient.id,
            UserShare.is_revoked == False
        )
    )
    if existing_share_res.scalars().first():
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
            "file_size": file_item.file_size,
            "recipient_email": recipient.email,
            "recipient_name": recipient.full_name or recipient.username,
            "recipient_username": recipient.username
        }
    )

@router.get("/shared-with-me", response_model=List[UserShareResponse])
async def list_shared_with_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Find all users blocked by or blocking current_user
    blocked_res = await db.execute(
        select(UserConnection).where(
            UserConnection.is_blocked.is_(True),
            or_(
                UserConnection.user_a_id == current_user.id,
                UserConnection.user_b_id == current_user.id
            )
        )
    )
    blocked_conns = blocked_res.scalars().all()
    blocked_user_ids = set()
    for c in blocked_conns:
        other_id = c.user_b_id if c.user_a_id == current_user.id else c.user_a_id
        blocked_user_ids.add(other_id)

    res = await db.execute(
        select(UserShare, FileItem, User)
        .join(FileItem, UserShare.file_id == FileItem.id)
        .join(User, UserShare.owner_id == User.id)
        .where(
            UserShare.recipient_id == current_user.id,
            UserShare.is_revoked == False
        )
        .order_by(desc(UserShare.created_at))
    )
    rows = res.all()

    result_list = []
    for share, file_item, owner in rows:
        if owner.id in blocked_user_ids:
            continue
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
                "owner_id": owner.id,
                "owner_email": owner.email,
                "owner_name": owner.full_name or owner.username,
                "owner_username": owner.username,
                "created_at": share.created_at.isoformat() if share.created_at else None
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
        .order_by(desc(UserShare.created_at))
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
                "file_size": file_item.file_size,
                "recipient_id": recipient.id,
                "recipient_email": recipient.email,
                "recipient_name": recipient.full_name or recipient.username,
                "recipient_username": recipient.username,
                "created_at": share.created_at.isoformat() if share.created_at else None
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

@router.post("/block-sender/{sender_id}")
async def block_file_sender(
    sender_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if sender_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself.")

    u_min, u_max = pair_ids(current_user.id, sender_id)
    res = await db.execute(
        select(UserConnection).where(
            UserConnection.user_a_id == u_min,
            UserConnection.user_b_id == u_max
        )
    )
    conn = res.scalars().first()
    if not conn:
        conn = UserConnection(
            user_a_id=u_min,
            user_b_id=u_max,
            is_blocked=True,
            blocked_by_id=current_user.id
        )
        db.add(conn)
    else:
        conn.is_blocked = True
        conn.blocked_by_id = current_user.id

    # Revoke all existing inbound shares from this sender to current_user
    inbound_shares = await db.execute(
        select(UserShare).where(
            UserShare.owner_id == sender_id,
            UserShare.recipient_id == current_user.id
        )
    )
    for s in inbound_shares.scalars().all():
        s.is_revoked = True

    activity = ActivityLog(
        user_id=current_user.id,
        action_type="BLOCK_FILE_SENDER",
        description=f"Blocked sender '{sender_id}' from sharing files."
    )
    db.add(activity)
    await db.commit()

    return {
        "message": "User blocked successfully. They can no longer send files to you, and past shared files have been removed.",
        "is_blocked": True
    }

@router.get("/shared-file/{file_id}/download")
async def download_user_shared_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Support lookup by either file_id or share_id; pick latest active share
    share_res = await db.execute(
        select(UserShare).where(
            or_(UserShare.file_id == file_id, UserShare.id == file_id),
            UserShare.recipient_id == current_user.id
        ).order_by(UserShare.is_revoked.asc(), desc(UserShare.created_at))
    )
    user_share = share_res.scalars().first()
    
    if not user_share or user_share.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Share has been revoked by the owner or access permission does not exist."
        )

    # Check if communication is blocked
    if await is_blocked_between(db, current_user.id, user_share.owner_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: File sender is blocked."
        )

    file_res = await db.execute(select(FileItem).where(FileItem.id == user_share.file_id))
    file_item = file_res.scalar_one_or_none()
    if not file_item:
        raise HTTPException(status_code=404, detail="File item not found on server.")

    if not storage_service.file_exists(file_item.storage_path):
        raise HTTPException(status_code=404, detail="Encrypted file payload missing from object storage.")

    try:
        file_bytes = storage_service.get_file(file_item.storage_path)
    except Exception as e:
        logger.error(f"Failed to read file from storage: {e}")
        raise HTTPException(status_code=500, detail=f"Storage retrieval error: {str(e)}")

    if not file_item.is_encrypted:
        decrypted_bytes = file_bytes
    else:
        try:
            recipient_priv_key = decrypt_user_private_key(current_user.encrypted_private_key_pem, current_user.id)
            file_dek = rsa_decrypt_dek(user_share.encrypted_dek_for_recipient, recipient_priv_key)
            decrypted_bytes = decrypt_data_aes(file_bytes, file_dek)
        except Exception as e:
            logger.warning(f"Direct recipient DEK decryption error: {e}. Attempting owner DEK fallback...")
            try:
                owner_res = await db.execute(select(User).where(User.id == user_share.owner_id))
                owner = owner_res.scalar_one_or_none()
                if owner and owner.encrypted_private_key_pem and file_item.encrypted_dek:
                    owner_priv_key = decrypt_user_private_key(owner.encrypted_private_key_pem, owner.id)
                    file_dek = rsa_decrypt_dek(file_item.encrypted_dek, owner_priv_key)
                    decrypted_bytes = decrypt_data_aes(file_bytes, file_dek)
                else:
                    raise e
            except Exception as e2:
                logger.error(f"All hybrid decryption attempts failed: {e2}")
                raise HTTPException(status_code=500, detail=f"Cryptographic decryption failed: {str(e2)}")

    activity = ActivityLog(
        user_id=current_user.id,
        action_type="DOWNLOAD_SHARED",
        description=f"Downloaded shared file '{file_item.original_name}' (Hybrid Decryption)."
    )
    db.add(activity)
    await db.commit()

    clean_filename = file_item.original_name.replace('"', '').replace('\n', '').strip()
    return StreamingResponse(
        io.BytesIO(decrypted_bytes),
        media_type=file_item.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{clean_filename}"',
            "Content-Length": str(len(decrypted_bytes)),
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
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
    if not file_item or not storage_service.file_exists(file_item.storage_path):
        raise HTTPException(status_code=404, detail="Shared file resource not available.")

    owner_res = await db.execute(select(User).where(User.id == file_item.user_id))
    owner = owner_res.scalar_one_or_none()

    file_bytes = storage_service.get_file(file_item.storage_path)

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
