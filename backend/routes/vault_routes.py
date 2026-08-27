from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models import User, VaultSecret, ActivityLog
from backend.schemas import VaultSecretCreate, VaultSecretResponse
from backend.auth import get_current_user
from backend.crypto_utils import encrypt_data, decrypt_data, derive_key

router = APIRouter(prefix="/api/vault", tags=["Vault"])

@router.get("", response_model=List[VaultSecretResponse])
async def list_vault_secrets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(VaultSecret).where(VaultSecret.user_id == current_user.id).order_by(VaultSecret.created_at.desc())
    )
    secrets = res.scalars().all()
    
    # Decrypt secret payloads for user response
    user_key = derive_key(current_user.id)
    response_list = []
    for secret in secrets:
        try:
            raw_payload_bytes = bytes.fromhex(secret.encrypted_payload)
            decrypted = decrypt_data(raw_payload_bytes, user_key).decode("utf-8")
        except Exception:
            decrypted = "[Decryption Failed]"

        response_list.append(VaultSecretResponse(
            id=secret.id,
            title=secret.title,
            secret_type=secret.secret_type,
            encrypted_payload=decrypted,
            created_at=secret.created_at,
            updated_at=secret.updated_at
        ))

    return response_list

@router.post("", response_model=VaultSecretResponse, status_code=status.HTTP_201_CREATED)
async def create_vault_secret(
    secret_in: VaultSecretCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_key = derive_key(current_user.id)
    encrypted_bytes, _ = encrypt_data(secret_in.payload.encode("utf-8"), key=user_key)
    hex_payload = encrypted_bytes.hex()

    secret = VaultSecret(
        user_id=current_user.id,
        title=secret_in.title,
        encrypted_payload=hex_payload,
        secret_type=secret_in.secret_type
    )
    db.add(secret)

    activity = ActivityLog(
        user_id=current_user.id,
        action_type="VAULT_ADD",
        description=f"Added vault secret '{secret_in.title}'."
    )
    db.add(activity)
    await db.commit()
    await db.refresh(secret)

    return VaultSecretResponse(
        id=secret.id,
        title=secret.title,
        secret_type=secret.secret_type,
        encrypted_payload=secret_in.payload,
        created_at=secret.created_at,
        updated_at=secret.updated_at
    )

@router.delete("/{secret_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vault_secret(
    secret_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(VaultSecret).where(VaultSecret.id == secret_id, VaultSecret.user_id == current_user.id)
    )
    secret = res.scalar_one_or_none()
    if not secret:
        raise HTTPException(status_code=404, detail="Vault secret not found.")

    activity = ActivityLog(
        user_id=current_user.id,
        action_type="VAULT_DELETE",
        description=f"Deleted vault secret '{secret.title}'."
    )
    db.add(activity)
    await db.delete(secret)
    await db.commit()
