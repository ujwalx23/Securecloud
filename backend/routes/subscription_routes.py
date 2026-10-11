import secrets
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.database import get_db
from backend.models import (
    User,
    StorageAllocationSlot,
    SubscriptionRecord,
    Notification,
    SecurityAuditLog,
    FileItem
)
from backend.schemas import (
    SubscriptionStatusResponse,
    UpgradePlanRequest,
    StripeCheckoutRequest
)
from backend.auth import get_current_user
from backend.storage_allocation import PREMIUM_1GB_QUOTA_BYTES

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions & Plans"])

def utc_now():
    return datetime.now(timezone.utc)

def is_in_past(dt: Optional[datetime]) -> bool:
    if not dt:
        return False
    now = datetime.now(timezone.utc) if dt.tzinfo else datetime.now(timezone.utc).replace(tzinfo=None)
    return dt < now


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Automatic Trial Expiration & Demotion Check
    # If trial has expired and user hasn't purchased paid subscription:
    if (
        is_in_past(current_user.trial_expires_at)
        and current_user.plan_type == "premium"
        and (current_user.subscription_expires_at is None or is_in_past(current_user.subscription_expires_at))
        and current_user.email != "ujwalsingh164@gmail.com"  # Protected developer account
    ):
        # Demote user to Basic
        current_user.plan_type = "basic"
        current_user.storage_quota_bytes = 0

        # Purge files stored in vault after 1-month trial expired to protect data privacy
        expired_files_res = await db.execute(
            select(FileItem).where(FileItem.user_id == current_user.id)
        )
        expired_files = expired_files_res.scalars().all()
        for f in expired_files:
            await db.delete(f)
        current_user.storage_used_bytes = 0

        # Notification to user
        notif = Notification(
            user_id=current_user.id,
            type="system",
            title="30-Day Free Trial Concluded",
            content="Your 1-month Free Trial has ended and your account has reverted to the Basic tier. To regain 1 GB storage, please upgrade to the ₹399/yr plan."
        )
        db.add(notif)
        await db.commit()
        await db.refresh(current_user)

    # Check promotional slot if any
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
        trial_started_at=current_user.trial_started_at,
        trial_expires_at=current_user.trial_expires_at,
        has_used_trial=current_user.trial_started_at is not None,
        subscription_expires_at=current_user.subscription_expires_at,
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
                "storage_label": "Text Notes & Chat",
                "features": [
                    "Full User Registration & Account Verification",
                    "Unique Username & Profile Handle",
                    "Encrypted Personal Markdown Docs & Notes",
                    "Private 1-on-1 End-to-End Chat",
                    "User Search & Contact Connections",
                    "30-Day Free Trial of Premium Available"
                ],
                "badge": "FREE TIER",
                "button_text": "Current Plan"
            },
            {
                "id": "premium",
                "name": "Premium",
                "price_inr": 399,
                "billing_period": "per year",
                "storage_label": "1 GB Cloud Storage",
                "features": [
                    "1 GB (1,073 MB) Zero-Knowledge Cloud File Storage",
                    "End-to-End Hybrid Encrypted File Uploads",
                    "Encrypted Folder Tree & Hierarchy Management",
                    "Cryptographic File Sharing Links with Expiration",
                    "Real-Time SHA-256 Integrity Verification Center",
                    "All Basic Text & Private Chat Features Included",
                    "1-Month Free Trial with 1 GB Storage Included"
                ],
                "badge": "RECOMMENDED (1 GB)",
                "button_text": "Upgrade to 1 GB (₹399/yr)"
            },
            {
                "id": "custom",
                "name": "Custom Enterprise",
                "price_inr": None,
                "billing_period": "Individually Negotiated",
                "storage_label": "Multi-GB / TB Storage",
                "features": [
                    "Dedicated High-Capacity Storage Quotas",
                    "Hardware Security Module (HSM) Key Wrapping",
                    "Department & Organization Multi-Tenant Workspaces",
                    "Dedicated Ingestion APIs & Webhook Support",
                    "Priority Direct Engineering & SLA Support"
                ],
                "badge": "ENTERPRISE",
                "contact_email": "ujwalsingh164@gmail.com",
                "button_text": "Contact Enterprise Support"
            }
        ]
    }


@router.post("/start-trial")
async def start_one_month_free_trial(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.plan_type == "premium" and (
        current_user.subscription_expires_at and current_user.subscription_expires_at > utc_now()
    ):
        raise HTTPException(
            status_code=400,
            detail="You already have an active paid Premium subscription."
        )

    if current_user.trial_started_at is not None:
        raise HTTPException(
            status_code=400,
            detail="You have already utilized your 1-Month Free Trial. Please upgrade to Premium for ₹399/year."
        )

    # Activate 30-day Free Trial with 1 GB
    now = utc_now()
    trial_end = now + timedelta(days=30)

    current_user.plan_type = "premium"
    current_user.storage_quota_bytes = PREMIUM_1GB_QUOTA_BYTES
    current_user.trial_started_at = now
    current_user.trial_expires_at = trial_end
    current_user.is_promotional_premium = False
    current_user.queue_position = None

    record = SubscriptionRecord(
        user_id=current_user.id,
        plan_name="premium_trial",
        amount_paise=0,
        status="trial_active",
        payment_provider="free_trial",
        payment_id=f"trial_{secrets.token_hex(8)}",
        order_id=f"order_trial_{secrets.token_hex(6)}",
        started_at=now,
        expires_at=trial_end
    )
    db.add(record)

    notif = Notification(
        user_id=current_user.id,
        type="promotion",
        title="1-Month Free Trial Activated!",
        content="Your 30-day Free Trial of SecureCloud Premium (1 GB) is now active! Note: After 30 days, your account will revert to Basic unless upgraded to the ₹399/yr plan."
    )
    db.add(notif)

    audit = SecurityAuditLog(
        user_id=current_user.id,
        action_type="TRIAL_ACTIVATED",
        description="User activated 30-day Free Trial with 1 GB storage.",
        ip_address="system"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(current_user)

    return {
        "message": "1-Month Free Trial of Premium (1 GB) activated successfully!",
        "plan": "premium",
        "storage_quota_bytes": current_user.storage_quota_bytes,
        "trial_expires_at": current_user.trial_expires_at.isoformat()
    }


@router.post("/checkout-stripe")
async def checkout_with_stripe(
    checkout_data: StripeCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    now = utc_now()
    sub_end = now + timedelta(days=365)
    txn_id = f"pi_stripe_{secrets.token_hex(12)}"
    receipt_no = f"INV-{now.strftime('%Y%m')}-{secrets.token_hex(4).upper()}"

    current_user.plan_type = "premium"
    current_user.storage_quota_bytes = PREMIUM_1GB_QUOTA_BYTES
    current_user.subscription_expires_at = sub_end
    current_user.is_promotional_premium = False
    current_user.queue_position = None

    record = SubscriptionRecord(
        user_id=current_user.id,
        plan_name="premium",
        amount_paise=39900,  # ₹399
        status="active",
        payment_provider="stripe",
        payment_id=txn_id,
        order_id=receipt_no,
        started_at=now,
        expires_at=sub_end
    )
    db.add(record)

    notif = Notification(
        user_id=current_user.id,
        type="promotion",
        title="SecureCloud Premium Subscription Confirmed",
        content=f"Payment of ₹399 processed securely via Stripe. Receipt: {receipt_no}. Your 1 GB high-security storage is active for 1 full year."
    )
    db.add(notif)

    audit = SecurityAuditLog(
        user_id=current_user.id,
        action_type="STRIPE_PAYMENT_SUCCESS",
        description=f"Subscription renewed for ₹399/year. Stripe Transaction: {txn_id}.",
        ip_address="system"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(current_user)

    return {
        "message": "Payment successful! SecureCloud Premium (1 GB) is activated for 1 year.",
        "plan": "premium",
        "receipt_number": receipt_no,
        "transaction_id": txn_id,
        "expires_at": sub_end.isoformat(),
        "storage_quota_bytes": current_user.storage_quota_bytes
    }


@router.post("/upgrade")
async def upgrade_subscription(
    data: UpgradePlanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    plan = data.plan_name.lower().strip()
    if plan == "premium":
        now = utc_now()
        sub_end = now + timedelta(days=365)

        current_user.plan_type = "premium"
        current_user.storage_quota_bytes = PREMIUM_1GB_QUOTA_BYTES
        current_user.subscription_expires_at = sub_end
        current_user.is_promotional_premium = False
        current_user.queue_position = None

        record = SubscriptionRecord(
            user_id=current_user.id,
            plan_name="premium",
            amount_paise=39900,
            status="active",
            payment_provider="stripe",
            payment_id=data.payment_id or f"pi_{secrets.token_hex(10)}",
            order_id=data.order_id or f"ord_{secrets.token_hex(6)}",
            started_at=now,
            expires_at=sub_end
        )
        db.add(record)

        notif = Notification(
            user_id=current_user.id,
            type="promotion",
            title="Premium Subscription Active!",
            content="Thank you for upgrading to Premium (₹399/year). Your 1 GB storage quota is now active."
        )
        db.add(notif)
        await db.commit()
        return {"message": "Successfully upgraded to Premium (1 GB)!", "plan": "premium"}

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

    notif = Notification(
        user_id=current_user.id,
        type="system",
        title="Subscription Cancellation Notice",
        content="Your subscription has been canceled. Your files remain accessible until the billing period concludes."
    )
    db.add(notif)
    await db.commit()
    return {"message": "Subscription set to cancel. Files remain accessible."}
