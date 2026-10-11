from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, delete

from backend.database import get_db
from backend.models import (
    User,
    StorageAllocationSlot,
    SubscriptionRecord,
    SecurityAuditLog,
    Notification,
    ContactInquiry,
    FileItem,
    VaultSecret,
    TextDocument,
    Conversation,
    UserShare
)
from backend.schemas import (
    AdminOverviewResponse,
    AdminUserAction,
    ContactInquiryCreate,
    ContactInquiryResponse,
    ContactInquiryStatusUpdate,
    AdminQuotaUpdate,
    AdminPasswordReset
)
from backend.auth import get_current_admin_user, get_password_hash
from backend.storage_allocation import (
    PROMOTIONAL_SLOT_QUOTA_BYTES,
    release_slot_and_promote_next
)
from backend.email_service import generate_verification_code

router = APIRouter(prefix="/api/admin", tags=["Administration & Monitoring"])

def utc_now():
    return datetime.now(timezone.utc)


# =========================================================
# 0. Public Contact Submission Endpoint (Saves to DB)
# =========================================================

@router.post("/contact-submit", response_model=ContactInquiryResponse, status_code=status.HTTP_201_CREATED)
async def submit_contact_inquiry(
    inquiry_in: ContactInquiryCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or request.client.host if request.client else "127.0.0.1"
    
    inquiry = ContactInquiry(
        name=inquiry_in.name.strip(),
        email=inquiry_in.email.strip().lower(),
        category=inquiry_in.category.strip(),
        subject=inquiry_in.subject.strip() if inquiry_in.subject else "General Inquiry",
        message=inquiry_in.message.strip(),
        status="pending",
        ip_address=client_ip
    )
    db.add(inquiry)
    await db.commit()
    await db.refresh(inquiry)
    return inquiry


# =========================================================
# 1. Executive System Overview & Telemetry
# =========================================================

@router.get("/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    # User counts
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

    # Storage & Slots
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

    # Files & Data entities
    files_count_res = await db.execute(select(func.count(FileItem.id)))
    total_files = files_count_res.scalar() or 0

    vault_count_res = await db.execute(select(func.count(VaultSecret.id)))
    total_vault_items = vault_count_res.scalar() or 0

    docs_count_res = await db.execute(select(func.count(TextDocument.id)))
    total_documents = docs_count_res.scalar() or 0

    chats_count_res = await db.execute(select(func.count(Conversation.id)))
    total_chats = chats_count_res.scalar() or 0

    shares_count_res = await db.execute(select(func.count(UserShare.id)))
    total_shared_files = shares_count_res.scalar() or 0

    # Contact inquiries
    total_inq_res = await db.execute(select(func.count(ContactInquiry.id)))
    total_inquiries = total_inq_res.scalar() or 0

    pending_inq_res = await db.execute(select(func.count(ContactInquiry.id)).where(ContactInquiry.status == "pending"))
    pending_inquiries = pending_inq_res.scalar() or 0

    # Active OTPs
    otps_count_res = await db.execute(
        select(func.count(User.id)).where(
            User.verification_code.is_not(None),
            User.verification_expires_at > utc_now()
        )
    )
    active_otps_count = otps_count_res.scalar() or 0

    # Recent Audit Logs
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
        total_files=total_files,
        total_vault_items=total_vault_items,
        total_documents=total_documents,
        total_chats=total_chats,
        total_shared_files=total_shared_files,
        total_inquiries=total_inquiries,
        pending_inquiries=pending_inquiries,
        active_otps_count=active_otps_count,
        recent_audit_logs=recent_logs
    )


# =========================================================
# 2. Comprehensive User Directory & Controls
# =========================================================

@router.get("/users")
async def list_admin_users(
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(User).order_by(desc(User.created_at)).limit(200)
    )
    users = res.scalars().all()
    
    # Query file counts per user
    file_counts_res = await db.execute(
        select(FileItem.user_id, func.count(FileItem.id)).group_by(FileItem.user_id)
    )
    file_counts = dict(file_counts_res.all())

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
            "verification_code": u.verification_code,
            "verification_expires_at": u.verification_expires_at.isoformat() if u.verification_expires_at else None,
            "has_keys": bool(u.public_key_pem and u.encrypted_private_key_pem),
            "file_count": file_counts.get(u.id, 0),
            "created_at": u.created_at.isoformat()
        }
        for u in users
    ]


@router.post("/users/{target_user_id}/verify-email")
async def admin_verify_user_email(
    target_user_id: str,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(User).where(User.id == target_user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Target user not found.")

    user.is_verified = True
    user.verification_code = None
    user.verification_expires_at = None

    audit = SecurityAuditLog(
        user_id=admin_user.id,
        action_type="ADMIN_VERIFY_EMAIL",
        description=f"Admin {admin_user.username} force-verified email for @{user.username} ({user.email})."
    )
    db.add(audit)
    await db.commit()
    return {"message": f"User @{user.username} email ({user.email}) verified successfully."}


@router.post("/users/{target_user_id}/generate-otp")
async def admin_generate_user_otp(
    target_user_id: str,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(User).where(User.id == target_user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Target user not found.")

    otp = generate_verification_code()
    user.verification_code = otp
    user.verification_expires_at = utc_now() + timedelta(minutes=30)

    audit = SecurityAuditLog(
        user_id=admin_user.id,
        action_type="ADMIN_GENERATE_OTP",
        description=f"Admin {admin_user.username} generated fresh security OTP for @{user.username} ({user.email})."
    )
    db.add(audit)
    await db.commit()
    return {
        "message": f"Generated fresh OTP for @{user.username}",
        "otp_code": otp,
        "email": user.email,
        "expires_in_minutes": 30
    }


@router.post("/users/{target_user_id}/reset-password")
async def admin_reset_user_password(
    target_user_id: str,
    data: AdminPasswordReset,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(User).where(User.id == target_user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Target user not found.")

    user.password_hash = get_password_hash(data.new_password)
    user.verification_code = None
    user.verification_expires_at = None

    audit = SecurityAuditLog(
        user_id=admin_user.id,
        action_type="ADMIN_RESET_PASSWORD",
        description=f"Admin {admin_user.username} directly reset password for @{user.username} ({user.email})."
    )
    db.add(audit)
    await db.commit()
    return {"message": f"Password reset successfully for @{user.username}."}


@router.patch("/users/{target_user_id}/quota")
async def admin_update_user_quota(
    target_user_id: str,
    data: AdminQuotaUpdate,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(User).where(User.id == target_user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Target user not found.")

    user.storage_quota_bytes = data.storage_quota_bytes
    if data.storage_quota_bytes > 0:
        user.plan_type = "premium" if data.storage_quota_bytes <= 1073741824 else "custom"

    audit = SecurityAuditLog(
        user_id=admin_user.id,
        action_type="ADMIN_SET_QUOTA",
        description=f"Admin {admin_user.username} set storage quota for @{user.username} to {data.storage_quota_bytes} bytes."
    )
    db.add(audit)
    await db.commit()
    return {"message": f"Storage quota updated for @{user.username} to {data.storage_quota_bytes} bytes."}


@router.patch("/users/{target_user_id}/toggle-admin")
async def admin_toggle_user_admin(
    target_user_id: str,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    if target_user_id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot alter your own administrator privileges.")

    res = await db.execute(select(User).where(User.id == target_user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Target user not found.")

    user.is_admin = not user.is_admin

    audit = SecurityAuditLog(
        user_id=admin_user.id,
        action_type="ADMIN_TOGGLE_ROLE",
        description=f"Admin {admin_user.username} changed admin role for @{user.username} to {user.is_admin}."
    )
    db.add(audit)
    await db.commit()
    return {
        "message": f"User @{user.username} is {'now an Administrator' if user.is_admin else 'no longer an Administrator'}.",
        "is_admin": user.is_admin
    }


@router.delete("/users/{target_user_id}")
async def admin_delete_user(
    target_user_id: str,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    if target_user_id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own administrator account.")

    res = await db.execute(select(User).where(User.id == target_user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Target user not found.")

    await release_slot_and_promote_next(db, user.id)
    username = user.username
    await db.delete(user)

    audit = SecurityAuditLog(
        user_id=admin_user.id,
        action_type="ADMIN_DELETE_USER",
        description=f"Admin {admin_user.username} permanently deleted user @{username} (ID: {target_user_id})."
    )
    db.add(audit)
    await db.commit()
    return {"message": f"User @{username} and associated vault data permanently deleted."}


# =========================================================
# 3. Contact Inquiries Management
# =========================================================

@router.get("/contact-inquiries", response_model=List[ContactInquiryResponse])
async def list_contact_inquiries(
    status_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    search: Optional[str] = None,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(ContactInquiry).order_by(desc(ContactInquiry.created_at))
    
    if status_filter and status_filter != "all":
        query = query.where(ContactInquiry.status == status_filter)
    if category_filter and category_filter != "all":
        query = query.where(ContactInquiry.category == category_filter)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.where(or_(
            ContactInquiry.name.ilike(s),
            ContactInquiry.email.ilike(s),
            ContactInquiry.subject.ilike(s),
            ContactInquiry.message.ilike(s)
        ))

    res = await db.execute(query.limit(100))
    return res.scalars().all()


@router.patch("/contact-inquiries/{inquiry_id}/status")
async def update_contact_inquiry_status(
    inquiry_id: str,
    data: ContactInquiryStatusUpdate,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(ContactInquiry).where(ContactInquiry.id == inquiry_id))
    inquiry = res.scalar_one_or_none()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Contact inquiry not found.")

    inquiry.status = data.status
    if data.admin_notes is not None:
        inquiry.admin_notes = data.admin_notes
    if data.status in ("resolved", "closed"):
        inquiry.resolved_at = utc_now()
    else:
        inquiry.resolved_at = None

    await db.commit()
    await db.refresh(inquiry)
    return {"message": f"Inquiry status updated to '{inquiry.status}'.", "status": inquiry.status}


@router.delete("/contact-inquiries/{inquiry_id}")
async def delete_contact_inquiry(
    inquiry_id: str,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(ContactInquiry).where(ContactInquiry.id == inquiry_id))
    inquiry = res.scalar_one_or_none()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Contact inquiry not found.")

    await db.delete(inquiry)
    await db.commit()
    return {"message": "Contact inquiry deleted successfully."}


# =========================================================
# 4. Security Audit Logs Query
# =========================================================

@router.get("/audit-logs")
async def get_admin_audit_logs(
    action_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(SecurityAuditLog).order_by(desc(SecurityAuditLog.created_at))
    if action_type and action_type != "all":
        query = query.where(SecurityAuditLog.action_type == action_type)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.where(or_(
            SecurityAuditLog.description.ilike(s),
            SecurityAuditLog.ip_address.ilike(s)
        ))

    res = await db.execute(query.limit(min(limit, 200)))
    logs = res.scalars().all()
    return [
        {
            "id": l.id,
            "action_type": l.action_type,
            "description": l.description,
            "ip_address": l.ip_address,
            "user_agent": l.user_agent,
            "created_at": l.created_at.isoformat()
        }
        for l in logs
    ]


# =========================================================
# 5. Promotional Slots Management
# =========================================================

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
        promoted_id = await release_slot_and_promote_next(db, user.id)
        msg = f"User @{user.username} suspended."
        if promoted_id:
            msg += f" Promotional slot vacated and assigned to next candidate."

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
