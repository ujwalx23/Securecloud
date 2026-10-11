from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update

from backend.database import get_db
from backend.models import (
    User,
    StorageAllocationSlot,
    SubscriptionRecord,
    SecurityAuditLog,
    Notification
)
from backend.schemas import (
    AdminOverviewResponse,
    AdminUserAction
)
from backend.auth import get_current_admin_user
from backend.storage_allocation import (
    PROMOTIONAL_SLOT_QUOTA_BYTES,
    release_slot_and_promote_next
)

router = APIRouter(prefix="/api/admin", tags=["Administration & Monitoring"])

def utc_now():
    return datetime.now(timezone.utc)


@router.get("/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    total_users_res = await db.execute(select(func.count(User.id)))
    total_users = total_users_res.scalar() or 0

    verified_users_res = await db.execute(select(func.count(User.id)).where(User.is_verified.is_(True)))
    verified_users = verified_users_res.scalar() or 0

    basic_users_res = await db.execute(select(func.count(User.id)).where(User.plan_type == "basic"))
    basic_users = basic_users_res.scalar() or 0

    premium_users_res = await db.execute(select(func.count(User.id)).where(User.plan_type == "premium"))
    premium_users = premium_users_res.scalar() or 0

    custom_users_res = await db.execute(select(func.count(User.id)).where(User.plan_type == "custom"))
    custom_users = custom_users_res.scalar() or 0

    active_slots_res = await db.execute(
        select(func.count(StorageAllocationSlot.id)).where(StorageAllocationSlot.user_id.is_not(None))
    )
    active_slots = active_slots_res.scalar() or 0

    queue_length_res = await db.execute(
        select(func.count(User.id)).where(User.queue_position.is_not(None))
    )
    queue_length = queue_length_res.scalar() or 0

    total_storage_allocated_res = await db.execute(select(func.coalesce(func.sum(User.storage_quota_bytes), 0)))
    total_storage_allocated = total_storage_allocated_res.scalar() or 0

    total_storage_used_res = await db.execute(select(func.coalesce(func.sum(User.storage_used_bytes), 0)))
    total_storage_used = total_storage_used_res.scalar() or 0

    logs_res = await db.execute(
        select(SecurityAuditLog)
        .order_by(desc(SecurityAuditLog.created_at))
        .limit(20)
    )
    recent_logs = [
        {
            "id": l.id,
            "action_type": l.action_type,
            "description": l.description,
            "ip_address": l.ip_address,
            "user_agent": l.user_agent,
            "created_at": l.created_at.isoformat()
        }
        for l in logs_res.scalars().all()
    ]

    return AdminOverviewResponse(
        total_users=total_users,
        verified_users=verified_users,
        basic_users=basic_users,
        premium_users=premium_users,
        custom_users=custom_users,
        active_slots=active_slots,
        queue_length=queue_length,
        total_storage_allocated_bytes=total_storage_allocated,
        total_storage_used_bytes=total_storage_used,
        recent_audit_logs=recent_logs
    )


@router.get("/users")
async def list_admin_users(
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(User).order_by(desc(User.created_at)).limit(100)
    )
    users = res.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "username": u.username,
            "full_name": u.full_name,
            "plan_type": u.plan_type,
            "is_promotional_premium": u.is_promotional_premium,
            "queue_position": u.queue_position,
            "storage_quota_bytes": u.storage_quota_bytes,
            "storage_used_bytes": u.storage_used_bytes,
            "is_verified": u.is_verified,
            "is_admin": u.is_admin,
            "is_active": u.is_active,
            "online_status": u.online_status,
            "created_at": u.created_at.isoformat()
        }
        for u in users
    ]


@router.get("/slots")
async def list_promotional_slots(
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(StorageAllocationSlot, User)
        .outerjoin(User, StorageAllocationSlot.user_id == User.id)
        .order_by(StorageAllocationSlot.slot_number.asc())
    )
    rows = res.all()
    slots_data = []
    for slot, user in rows:
        slots_data.append({
            "slot_number": slot.slot_number,
            "user_id": slot.user_id,
            "username": user.username if user else None,
            "email": user.email if user else None,
            "allocated_at": slot.allocated_at.isoformat() if slot.allocated_at else None,
            "is_active": slot.is_active
        })
    return slots_data


@router.post("/users/{target_user_id}/action")
async def execute_user_action(
    target_user_id: str,
    action_data: AdminUserAction,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(User).where(User.id == target_user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Target user not found.")

    act = action_data.action.lower()
    if act == "suspend":
        user.is_active = False
        # Free slot if occupied
        promoted_id = await release_slot_and_promote_next(db, user.id)
        msg = f"User @{user.username} suspended."
        if promoted_id:
            msg += f" Promotional slot vacated and assigned to next queue candidate."

        audit = SecurityAuditLog(
            user_id=admin_user.id,
            action_type="ADMIN_USER_SUSPEND",
            description=f"Admin {admin_user.username} suspended user {user.username} (ID: {user.id})."
        )
        db.add(audit)
        await db.commit()
        return {"message": msg}

    elif act == "activate":
        user.is_active = True
        audit = SecurityAuditLog(
            user_id=admin_user.id,
            action_type="ADMIN_USER_ACTIVATE",
            description=f"Admin {admin_user.username} activated user {user.username}."
        )
        db.add(audit)
        await db.commit()
        return {"message": f"User @{user.username} activated."}

    elif act == "promote":
        # Check vacant slot
        slot_res = await db.execute(
            select(StorageAllocationSlot)
            .where(StorageAllocationSlot.user_id.is_(None))
            .order_by(StorageAllocationSlot.slot_number.asc())
        )
        vacant_slot = slot_res.scalars().first()
        if not vacant_slot:
            raise HTTPException(status_code=400, detail="All 10 promotional slots are currently occupied.")

        vacant_slot.user_id = user.id
        vacant_slot.allocated_at = utc_now()

        user.plan_type = "premium"
        user.is_promotional_premium = True
        user.storage_quota_bytes = PROMOTIONAL_SLOT_QUOTA_BYTES
        user.queue_position = None

        notif = Notification(
            user_id=user.id,
            type="promotion",
            title="Promoted by Administrator",
            content=f"An administrator has assigned Promotional Premium Slot #{vacant_slot.slot_number} (1,000 MB) to your account."
        )
        db.add(notif)
        await db.commit()
        return {"message": f"User @{user.username} promoted to Slot #{vacant_slot.slot_number}."}

    elif act == "demote":
        await release_slot_and_promote_next(db, user.id)
        user.plan_type = "basic"
        user.is_promotional_premium = False
        user.storage_quota_bytes = 0
        await db.commit()
        return {"message": f"User @{user.username} demoted to Basic plan."}

    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'suspend', 'activate', 'promote', or 'demote'.")
