from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from backend.database import get_db
from backend.models import User, TextDocument, ActivityLog
from backend.schemas import (
    TextDocumentCreate,
    TextDocumentUpdate,
    TextDocumentResponse
)
from backend.auth import get_current_user
from backend.storage_allocation import recalculate_user_text_storage

router = APIRouter(prefix="/api/documents", tags=["Text Documents & Notes"])

def utc_now():
    return datetime.now(timezone.utc)


@router.get("", response_model=List[TextDocumentResponse])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(TextDocument)
        .where(TextDocument.user_id == current_user.id)
        .order_by(desc(TextDocument.is_pinned), desc(TextDocument.updated_at))
    )
    docs = res.scalars().all()
    return docs


@router.post("", response_model=TextDocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    data: TextDocumentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    content_bytes = len(data.content.encode("utf-8"))
    title_bytes = len(data.title.encode("utf-8"))
    doc_size = content_bytes + title_bytes

    # Check text storage quota
    if current_user.text_storage_used_bytes + doc_size > current_user.text_storage_quota_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Text storage quota exceeded ({current_user.text_storage_quota_bytes // 1024} KB limit). Please free up space or edit existing documents."
        )

    doc = TextDocument(
        user_id=current_user.id,
        title=data.title.strip(),
        content=data.content,
        size_bytes=doc_size,
        is_pinned=data.is_pinned
    )
    db.add(doc)
    await db.flush()

    await recalculate_user_text_storage(db, current_user.id)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/{doc_id}", response_model=TextDocumentResponse)
async def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(TextDocument).where(TextDocument.id == doc_id, TextDocument.user_id == current_user.id)
    )
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or access denied.")
    return doc


@router.put("/{doc_id}", response_model=TextDocumentResponse)
async def update_document(
    doc_id: str,
    data: TextDocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(TextDocument).where(TextDocument.id == doc_id, TextDocument.user_id == current_user.id)
    )
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or access denied.")

    new_title = data.title.strip() if data.title is not None else doc.title
    new_content = data.content if data.content is not None else doc.content
    new_size = len(new_title.encode("utf-8")) + len(new_content.encode("utf-8"))

    # Check quota adjustment
    size_delta = new_size - doc.size_bytes
    if current_user.text_storage_used_bytes + size_delta > current_user.text_storage_quota_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document size exceeds available text storage quota."
        )

    doc.title = new_title
    doc.content = new_content
    doc.size_bytes = new_size
    if data.is_pinned is not None:
        doc.is_pinned = data.is_pinned
    if data.is_favorite is not None:
        doc.is_favorite = data.is_favorite
    doc.updated_at = utc_now()

    await recalculate_user_text_storage(db, current_user.id)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(TextDocument).where(TextDocument.id == doc_id, TextDocument.user_id == current_user.id)
    )
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or access denied.")

    await db.delete(doc)
    await recalculate_user_text_storage(db, current_user.id)
    await db.commit()
    return {"message": "Document deleted successfully."}
