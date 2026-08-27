import os
import uuid
import io
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.config import STORAGE_DIR
from backend.database import get_db
from backend.models import User, FileItem, FileVersion, ActivityLog
from backend.schemas import FileResponse, FileVersionResponse
from backend.auth import get_current_user
from backend.crypto_utils import (
    generate_dek,
    encrypt_data_aes,
    decrypt_data_aes,
    rsa_encrypt_dek,
    rsa_decrypt_dek,
    decrypt_user_private_key,
    calculate_sha256,
    derive_key_from_password
)


router = APIRouter(prefix="/api/files", tags=["Files"])

@router.get("", response_model=List[FileResponse])
async def list_files(
    folder_id: Optional[str] = None,
    is_trashed: bool = False,
    is_favorite: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(FileItem).where(
        FileItem.user_id == current_user.id,
        FileItem.is_trashed == is_trashed
    )
    if search:
        query = query.where(FileItem.original_name.ilike(f"%{search}%"))
    elif folder_id is not None:
        query = query.where(FileItem.folder_id == folder_id)
    elif not is_trashed and is_favorite is None:
        query = query.where(FileItem.folder_id.is_(None))

    if is_favorite is not None:
        query = query.where(FileItem.is_favorite == is_favorite)

    result = await db.execute(query.order_by(FileItem.created_at.desc()))
    return result.scalars().all()

@router.post("/upload", response_model=FileResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    folder_id: Optional[str] = Form(None),
    is_encrypted: bool = Form(True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    content = await file.read()
    raw_size = len(content)

    if current_user.storage_used_bytes + raw_size > current_user.storage_quota_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Storage quota exceeded."
        )

    checksum = calculate_sha256(content)

    # HYBRID CRYPTOGRAPHY ENGINE:
    # Step 1: Generate per-file Data Encryption Key (DEK)
    file_dek = generate_dek()
    
    # Step 2: Encrypt payload with AES-256-GCM using file_dek
    if is_encrypted:
        stored_bytes = encrypt_data_aes(content, file_dek)
    else:
        stored_bytes = content

    # Step 3: Encrypt the per-file DEK with User's RSA-2048 Public Key
    encrypted_dek_hex = rsa_encrypt_dek(file_dek, current_user.public_key_pem)

    file_uuid = str(uuid.uuid4())
    filename_on_disk = f"{file_uuid}.enc"
    storage_path = str(STORAGE_DIR / filename_on_disk)

    with open(storage_path, "wb") as f:
        f.write(stored_bytes)

    stored_size = len(stored_bytes)

    existing_query = select(FileItem).where(
        FileItem.user_id == current_user.id,
        FileItem.original_name == file.filename,
        FileItem.folder_id == folder_id,
        FileItem.is_trashed == False
    )
    existing_res = await db.execute(existing_query)
    existing_file = existing_res.scalar_one_or_none()

    if existing_file:
        old_version = FileVersion(
            file_id=existing_file.id,
            version_number=existing_file.version,
            storage_path=existing_file.storage_path,
            file_size=existing_file.file_size,
            checksum_sha256=existing_file.checksum_sha256,
            encrypted_dek=existing_file.encrypted_dek
        )
        db.add(old_version)

        existing_file.version += 1
        existing_file.storage_path = storage_path
        existing_file.file_size = stored_size
        existing_file.checksum_sha256 = checksum
        existing_file.encrypted_dek = encrypted_dek_hex
        existing_file.mime_type = file.content_type or "application/octet-stream"

        current_user.storage_used_bytes += stored_size
        
        activity = ActivityLog(
            user_id=current_user.id,
            action_type="HYBRID_UPLOAD_VERSION",
            description=f"Uploaded version {existing_file.version} of file '{file.filename}' (RSA+AES)."
        )
        db.add(activity)
        await db.commit()
        await db.refresh(existing_file)
        return existing_file
    else:
        new_file = FileItem(
            id=file_uuid,
            original_name=file.filename,
            encrypted_filename=filename_on_disk,
            mime_type=file.content_type or "application/octet-stream",
            file_size=stored_size,
            storage_path=storage_path,
            checksum_sha256=checksum,
            encrypted_dek=encrypted_dek_hex,
            folder_id=folder_id,
            user_id=current_user.id,
            is_encrypted=is_encrypted,
            encryption_algo="RSA-2048 + AES-256-GCM",
            version=1
        )
        db.add(new_file)
        current_user.storage_used_bytes += stored_size

        activity = ActivityLog(
            user_id=current_user.id,
            action_type="HYBRID_UPLOAD",
            description=f"Uploaded file '{file.filename}' with RSA-2048 + AES-256-GCM Hybrid Encryption."
        )
        db.add(activity)
        await db.commit()
        await db.refresh(new_file)
        return new_file

async def _decrypt_file_item(file_item: FileItem, user: User) -> bytes:
    with open(file_item.storage_path, "rb") as f:
        file_bytes = f.read()

    if not file_item.is_encrypted:
        return file_bytes

    # HYBRID DECRYPTION:
    # 1. Decrypt user's RSA Private Key using deterministic wrapping key
    priv_key_pem = decrypt_user_private_key(user.encrypted_private_key_pem, user.id)
    
    # 2. Decrypt file DEK using user's RSA Private Key
    file_dek = rsa_decrypt_dek(file_item.encrypted_dek, priv_key_pem)

    # 3. Decrypt AES-256-GCM file content using DEK
    return decrypt_data_aes(file_bytes, file_dek)


@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(FileItem).where(FileItem.id == file_id, FileItem.user_id == current_user.id)
    )
    file_item = res.scalar_one_or_none()
    if not file_item or not os.path.exists(file_item.storage_path):
        raise HTTPException(status_code=404, detail="File not found.")

    try:
        decrypted_bytes = await _decrypt_file_item(file_item, current_user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hybrid decryption failed: {str(e)}")

    activity = ActivityLog(
        user_id=current_user.id,
        action_type="HYBRID_DOWNLOAD",
        description=f"Downloaded and decrypted file '{file_item.original_name}' (RSA+AES)."
    )
    db.add(activity)
    await db.commit()

    return StreamingResponse(
        io.BytesIO(decrypted_bytes),
        media_type=file_item.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{file_item.original_name}"'}
    )

@router.get("/{file_id}/preview")
async def preview_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(FileItem).where(FileItem.id == file_id, FileItem.user_id == current_user.id)
    )
    file_item = res.scalar_one_or_none()
    if not file_item or not os.path.exists(file_item.storage_path):
        raise HTTPException(status_code=404, detail="File not found.")

    try:
        decrypted_bytes = await _decrypt_file_item(file_item, current_user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hybrid preview decryption failed: {str(e)}")

    return StreamingResponse(
        io.BytesIO(decrypted_bytes),
        media_type=file_item.mime_type,
        headers={"Content-Disposition": f'inline; filename="{file_item.original_name}"'}
    )

@router.patch("/{file_id}/favorite", response_model=FileResponse)
async def toggle_favorite_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(FileItem).where(FileItem.id == file_id, FileItem.user_id == current_user.id)
    )
    file_item = res.scalar_one_or_none()
    if not file_item:
        raise HTTPException(status_code=404, detail="File not found.")

    file_item.is_favorite = not file_item.is_favorite
    await db.commit()
    await db.refresh(file_item)
    return file_item

@router.patch("/{file_id}/trash", response_model=FileResponse)
async def toggle_trash_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(FileItem).where(FileItem.id == file_id, FileItem.user_id == current_user.id)
    )
    file_item = res.scalar_one_or_none()
    if not file_item:
        raise HTTPException(status_code=404, detail="File not found.")

    file_item.is_trashed = not file_item.is_trashed
    action = "TRASH_FILE" if file_item.is_trashed else "RESTORE_FILE"
    activity = ActivityLog(
        user_id=current_user.id,
        action_type=action,
        description=f"{'Trashed' if file_item.is_trashed else 'Restored'} file '{file_item.original_name}'."
    )
    db.add(activity)
    await db.commit()
    await db.refresh(file_item)
    return file_item

@router.get("/{file_id}/versions", response_model=List[FileVersionResponse])
async def get_file_versions(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    file_res = await db.execute(
        select(FileItem).where(FileItem.id == file_id, FileItem.user_id == current_user.id)
    )
    if not file_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="File not found.")

    versions_res = await db.execute(
        select(FileVersion).where(FileVersion.file_id == file_id).order_by(FileVersion.version_number.desc())
    )
    return versions_res.scalars().all()

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file_permanently(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(FileItem).where(FileItem.id == file_id, FileItem.user_id == current_user.id)
    )
    file_item = res.scalar_one_or_none()
    if not file_item:
        raise HTTPException(status_code=404, detail="File not found.")

    current_user.storage_used_bytes = max(0, current_user.storage_used_bytes - file_item.file_size)

    if os.path.exists(file_item.storage_path):
        try:
            os.remove(file_item.storage_path)
        except OSError:
            pass

    activity = ActivityLog(
        user_id=current_user.id,
        action_type="DELETE_FILE",
        description=f"Permanently deleted file '{file_item.original_name}'."
    )
    db.add(activity)
    await db.delete(file_item)
    await db.commit()
