import uuid
from typing import Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import User, StorageAllocationSlot, Notification, FileItem, TextDocument

PROMOTIONAL_SLOT_QUOTA_BYTES = 1000 * 1024 * 1024  # 1,000 MB = 1,048,576,000 bytes
TOTAL_PROMOTIONAL_SLOTS = 10
BASIC_TEXT_QUOTA_BYTES = 5 * 1024 * 1024  # 5 MB text storage

def utc_now():
    return datetime.now(timezone.utc)

async def assign_initial_storage_or_queue(session: AsyncSession, user: User) -> Tuple[str, Optional[int]]:
    """
    Called upon successful email verification.
    If any of the 10 promotional slots are vacant, claim the lowest available slot.
    Otherwise, assign to the promotional waiting queue.
    """
    # Check if user already holds a slot
    existing_slot_res = await session.execute(
        select(StorageAllocationSlot).where(StorageAllocationSlot.user_id == user.id)
    )
    existing_slot = existing_slot_res.scalars().first()
    if existing_slot:
        return "premium", existing_slot.slot_number

    # Find the first vacant slot among the 10 promotional slots
    vacant_slot_res = await session.execute(
        select(StorageAllocationSlot)
        .where(StorageAllocationSlot.user_id.is_(None))
        .where(StorageAllocationSlot.is_active.is_(True))
        .order_by(StorageAllocationSlot.slot_number.asc())
    )
    vacant_slot = vacant_slot_res.scalars().first()

    if vacant_slot:
        # Claim the promotional slot!
        vacant_slot.user_id = user.id
        vacant_slot.allocated_at = utc_now()
        
        user.plan_type = "premium"
        user.is_promotional_premium = True
        user.storage_quota_bytes = PROMOTIONAL_SLOT_QUOTA_BYTES
        user.queue_position = None
        user.queue_joined_at = None

        notification = Notification(
            user_id=user.id,
            type="promotion",
            title="Promotional Premium Slot Claimed!",
            content=f"Congratulations! You secured Promotional Premium Slot #{vacant_slot.slot_number} of 10. You have been allocated 1,000 MB of secure cloud file storage at zero cost."
        )
        session.add(notification)
        return "premium", vacant_slot.slot_number
    else:
        # All 10 slots filled; add to queue
        max_q_res = await session.execute(
            select(func.max(User.queue_position))
        )
        max_pos = max_q_res.scalar() or 0
        new_pos = max_pos + 1

        user.plan_type = "basic"
        user.is_promotional_premium = False
        user.storage_quota_bytes = 0  # No file storage on basic unless promoted or subscribed
        user.queue_position = new_pos
        user.queue_joined_at = utc_now()

        notification = Notification(
            user_id=user.id,
            type="promotion",
            title="Added to Promotional Queue",
            content=f"All 10 promotional premium slots are currently claimed. You are at Queue Position #{new_pos}. As soon as a slot is vacated, eligible accounts are automatically promoted!"
        )
        session.add(notification)
        return "basic", new_pos


async def release_slot_and_promote_next(session: AsyncSession, user_id: str) -> Optional[str]:
    """
    Frees the slot held by user_id (e.g. account deletion, suspension, or downgrade),
    and automatically promotes the next eligible verified user waiting in the queue.
    """
    slot_res = await session.execute(
        select(StorageAllocationSlot).where(StorageAllocationSlot.user_id == user_id)
    )
    slot = slot_res.scalars().first()
    if not slot:
        return None  # User did not hold a promotional slot

    # Vacate the slot
    slot.user_id = None
    slot.allocated_at = None

    # Find the next eligible user in the queue
    next_user_res = await session.execute(
        select(User)
        .where(User.queue_position.is_not(None))
        .where(User.is_verified.is_(True))
        .where(User.is_active.is_(True))
        .order_by(User.queue_position.asc())
    )
    candidate = next_user_res.scalars().first()

    if candidate:
        # Promote candidate to this slot
        slot.user_id = candidate.id
        slot.allocated_at = utc_now()

        candidate.plan_type = "premium"
        candidate.is_promotional_premium = True
        candidate.storage_quota_bytes = PROMOTIONAL_SLOT_QUOTA_BYTES
        candidate.queue_position = None
        candidate.queue_joined_at = None

        notification = Notification(
            user_id=candidate.id,
            type="promotion",
            title="You Have Been Promoted to Premium!",
            content=f"A promotional slot freed up! You have been automatically promoted to Promotional Premium Slot #{slot.slot_number} (1,000 MB allocated storage)."
        )
        session.add(notification)

        # Flush candidate update
        await session.flush()

        # Re-index remaining queue positions sequentially (excluding promoted candidate)
        remaining_res = await session.execute(
            select(User)
            .where(User.id != candidate.id)
            .where(User.queue_position.is_not(None))
            .where(User.is_verified.is_(True))
            .order_by(User.queue_position.asc())
        )
        remaining_users = remaining_res.scalars().all()
        for idx, u in enumerate(remaining_users, start=1):
            u.queue_position = idx

        return candidate.id
    
    return None


async def recalculate_user_storage(session: AsyncSession, user_id: str) -> int:
    """
    Authoritatively calculate exact storage usage from active files in the database.
    Prevents client tampering.
    """
    res = await session.execute(
        select(func.coalesce(func.sum(FileItem.file_size), 0))
        .where(FileItem.user_id == user_id)
        .where(FileItem.is_trashed.is_(False))
    )
    used = int(res.scalar() or 0)
    
    user_res = await session.execute(select(User).where(User.id == user_id))
    user = user_res.scalars().first()
    if user:
        user.storage_used_bytes = used
    return used


async def recalculate_user_text_storage(session: AsyncSession, user_id: str) -> int:
    """
    Authoritatively calculate exact text notes storage usage.
    """
    res = await session.execute(
        select(func.coalesce(func.sum(TextDocument.size_bytes), 0))
        .where(TextDocument.user_id == user_id)
    )
    used = int(res.scalar() or 0)
    
    user_res = await session.execute(select(User).where(User.id == user_id))
    user = user_res.scalars().first()
    if user:
        user.text_storage_used_bytes = used
    return used
