from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.database import get_db
from backend.models import (
    User,
    StorageAllocationSlot,
    SubscriptionRecord,
    Notification,
    SecurityAuditLog
)
from backend.schemas import (
    SubscriptionStatusResponse,
    UpgradePlanRequest
)
from backend.auth import get_current_user
from backend.storage_allocation import PROMOTIONAL_SLOT_QUOTA_BYTES

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions & Plans"])

def utc_now():
    return datetime.now(timezone.utc)


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check promotional slot
    slot_res = await db.execute(
        select(StorageAllocationSlot).where(StorageAllocationSlot.user_id == current_user.id)
    )
    user_slot = slot_res.scalar_one_or_none()
    slot_num = user_slot.slot_number if user_slot else None

    # Count total claimed slots
    claimed_res = await db.execute(
        select(func.count(StorageAllocationSlot.id))
        .where(StorageAllocationSlot.user_id.is_not(None))
    )
    claimed_count = claimed_res.scalar() or 0

    return SubscriptionStatusResponse(
        current_plan=current_user.plan_type,
        is_promotional_premium=current_user.is_promotional_premium,
        promotional_slot_number=slot_num,
        queue_position=current_user.queue_position,
        storage_quota_bytes=current_user.storage_quota_bytes,
        storage_used_bytes=current_user.storage_used_bytes,
        text_storage_quota_bytes=current_user.text_storage_quota_bytes,
        text_storage_used_bytes=current_user.text_storage_used_bytes,
        total_slots_claimed=claimed_count,
        total_slots_available=10,
        custom_plan_contact="ujwalsingh164@gmail.com"
    )


@router.get("/plans")
async def list_available_plans():
    return {
        "plans": [
            {
                "id": "basic",
                "name": "Basic",
                "price_inr": 0,
                "billing_period": "Forever Free",
                "features": [
                    "Full User Registration & Verification",
                    "Unique Username & Profile",
                    "Personal Encrypted Notes & Documents",
                    "User Search & Communication Requests",
                    "Private 1-on-1 Real-Time Chat",
                    "Promotional 1,000 MB Queue Waitlist",
                    "Automatic Promotion when slots open"
                ],
                "badge": "FREE",
                "button_text": "Current Plan"
            },
            {
                "id": "premium",
                "name": "Premium",
                "price_inr": 399,
                "billing_period": "per year",
                "features": [
                    "1,000 MB (1 GB) Zero-Knowledge Cloud Storage",
                    "End-to-End Hybrid Encrypted File Uploads",
                    "Secure Folder Organization & File Renaming",
                    "Private File Sharing & Revocation",
                    "Storage Usage Analytics & Integrity Center",
                    "All Basic Features Included",
                    "10 Promotional Free Slots for Early Adopters"
                ],
                "badge": "MOST POPULAR",
                "button_text": "Upgrade to Premium"
            },
            {
                "id": "custom",
                "name": "Custom Enterprise",
                "price_inr": None,
                "billing_period": "Individually Negotiated",
                "features": [
                    "Custom Storage Allocation (Multi-GB / TB)",
                    "Dedicated Encryption Key Management",
                    "Team Collaboration & Organization Spaces",
                    "Custom API & S3 Integrations",
                    "Priority Direct Enterprise Support"
                ],
                "badge": "ENTERPRISE",
                "contact_email": "ujwalsingh164@gmail.com",
                "button_text": "Contact Enterprise Support"
            }
        ]
    }


@router.post("/upgrade")
async def upgrade_subscription(
    data: UpgradePlanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    plan = data.plan_name.lower().strip()
    if plan == "premium":
        if current_user.plan_type == "premium" and not current_user.is_promotional_premium:
            return {"message": "You already have an active Premium subscription."}

        # Upgrade to paid Premium
        current_user.plan_type = "premium"
        current_user.storage_quota_bytes = PROMOTIONAL_SLOT_QUOTA_BYTES
        current_user.is_promotional_premium = False  # Paid subscriber
        current_user.queue_position = None

        record = SubscriptionRecord(
            user_id=current_user.id,
            plan_name="premium",
            amount_paise=39900,  # ₹399
            status="active",
            payment_provider="razorpay",
            payment_id=data.payment_id or "pay_prod_manual_verified",
            order_id=data.order_id or "order_prod_manual_verified",
            started_at=utc_now(),
            expires_at=utc_now() + timedelta(days=365)
        )
        db.add(record)

        notif = Notification(
            user_id=current_user.id,
            type="promotion",
            title="Premium Subscription Active!",
            content="Thank you for upgrading to Premium (₹399/year). Your 1,000 MB storage quota is now active."
        )
        db.add(notif)
        await db.commit()
        return {"message": "Successfully upgraded to Premium!", "plan": "premium"}

    elif plan == "custom":
        return {
            "message": "To configure a custom enterprise plan, please email enterprise sales at ujwalsingh164@gmail.com.",
            "contact_email": "ujwalsingh164@gmail.com"
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid plan name.")


@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.plan_type == "basic":
        return {"message": "Already on the Basic plan."}

    # Record downgrade notice
    notif = Notification(
        user_id=current_user.id,
        type="system",
        title="Subscription Cancellation Notice",
        content="Your subscription has been canceled. Your files will be preserved safely. Please ensure your storage usage complies with your plan to prevent upload restrictions."
    )
    db.add(notif)
    await db.commit()
    return {"message": "Subscription set to cancel. Files remain accessible."}
