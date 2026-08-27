from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models import User, Folder, ActivityLog
from backend.schemas import FolderCreate, FolderResponse
from backend.auth import get_current_user

router = APIRouter(prefix="/api/folders", tags=["Folders"])

@router.get("", response_model=List[FolderResponse])
async def list_folders(
    parent_id: Optional[str] = None,
    is_trashed: bool = False,
    is_favorite: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Folder).where(
        Folder.user_id == current_user.id,
        Folder.is_trashed == is_trashed
    )
    if parent_id is not None:
        query = query.where(Folder.parent_id == parent_id)
    elif not is_trashed and is_favorite is None:
        query = query.where(Folder.parent_id.is_(None))
        
    if is_favorite is not None:
        query = query.where(Folder.is_favorite == is_favorite)

    result = await db.execute(query.order_by(Folder.name.asc()))
    return result.scalars().all()

@router.post("", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    folder_in: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if folder_in.parent_id:
        parent_res = await db.execute(
            select(Folder).where(Folder.id == folder_in.parent_id, Folder.user_id == current_user.id)
        )
        if not parent_res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Parent folder not found.")

    folder = Folder(
        name=folder_in.name,
        parent_id=folder_in.parent_id,
        user_id=current_user.id,
        color=folder_in.color or "#4f46e5"
    )
    db.add(folder)
    
    activity = ActivityLog(
        user_id=current_user.id,
        action_type="CREATE_FOLDER",
        description=f"Created folder '{folder_in.name}'."
    )
    db.add(activity)
    await db.commit()
    await db.refresh(folder)
    return folder

@router.patch("/{folder_id}/favorite", response_model=FolderResponse)
async def toggle_favorite_folder(
    folder_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == current_user.id)
    )
    folder = res.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found.")

    folder.is_favorite = not folder.is_favorite
    await db.commit()
    await db.refresh(folder)
    return folder

@router.patch("/{folder_id}/trash", response_model=FolderResponse)
async def toggle_trash_folder(
    folder_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == current_user.id)
    )
    folder = res.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found.")

    folder.is_trashed = not folder.is_trashed
    action = "TRASH_FOLDER" if folder.is_trashed else "RESTORE_FOLDER"
    activity = ActivityLog(
        user_id=current_user.id,
        action_type=action,
        description=f"{'Trashed' if folder.is_trashed else 'Restored'} folder '{folder.name}'."
    )
    db.add(activity)
    await db.commit()
    await db.refresh(folder)
    return folder

@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder_permanently(
    folder_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == current_user.id)
    )
    folder = res.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found.")

    activity = ActivityLog(
        user_id=current_user.id,
        action_type="DELETE_FOLDER",
        description=f"Permanently deleted folder '{folder.name}'."
    )
    db.add(activity)
    await db.delete(folder)
    await db.commit()
