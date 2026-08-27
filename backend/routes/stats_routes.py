from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.database import get_db
from backend.models import User, FileItem, Folder, ActivityLog
from backend.schemas import StorageStatsResponse, ActivityLogResponse
from backend.auth import get_current_user

router = APIRouter(prefix="/api/stats", tags=["Stats"])

@router.get("/summary", response_model=StorageStatsResponse)
async def get_storage_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    files_res = await db.execute(
        select(FileItem).where(FileItem.user_id == current_user.id, FileItem.is_trashed == False)
    )
    files = files_res.scalars().all()

    folders_res = await db.execute(
        select(func.count(Folder.id)).where(Folder.user_id == current_user.id, Folder.is_trashed == False)
    )
    folder_count = folders_res.scalar() or 0

    category_breakdown = {
        "documents": 0,
        "media": 0,
        "code": 0,
        "archives": 0,
        "other": 0
    }

    total_used = 0
    for f in files:
        total_used += f.file_size
        mime = f.mime_type.lower()
        ext = f.original_name.split(".")[-1].lower() if "." in f.original_name else ""

        if any(x in mime for x in ["image", "video", "audio"]) or ext in ["png", "jpg", "jpeg", "mp4", "mp3", "webm"]:
            category_breakdown["media"] += f.file_size
        elif any(x in mime for x in ["pdf", "text", "word", "excel", "document"]) or ext in ["pdf", "doc", "docx", "txt", "csv", "xlsx"]:
            category_breakdown["documents"] += f.file_size
        elif ext in ["py", "js", "jsx", "ts", "tsx", "html", "css", "json", "md", "cpp", "c", "java", "go", "rs"]:
            category_breakdown["code"] += f.file_size
        elif ext in ["zip", "tar", "gz", "7z", "rar"]:
            category_breakdown["archives"] += f.file_size
        else:
            category_breakdown["other"] += f.file_size

    # Sync user used storage
    current_user.storage_used_bytes = total_used
    await db.commit()

    return StorageStatsResponse(
        total_quota_bytes=current_user.storage_quota_bytes,
        used_bytes=total_used,
        available_bytes=max(0, current_user.storage_quota_bytes - total_used),
        file_count=len(files),
        folder_count=folder_count,
        category_breakdown=category_breakdown
    )

@router.get("/activity", response_model=List[ActivityLogResponse])
async def list_activity_logs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == current_user.id)
        .order_by(ActivityLog.timestamp.desc())
        .limit(50)
    )
    return res.scalars().all()
