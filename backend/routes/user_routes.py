from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc, func

from backend.database import get_db
from backend.models import (
    User,
    CommunicationRequest,
    UserConnection,
    Conversation,
    ConversationParticipant,
    Notification,
    SecurityAuditLog
)
from backend.schemas import (
    UserPublicProfile,
    CommunicationRequestCreate,
    CommunicationRequestAction,
    CommunicationRequestResponse,
    UserConnectionResponse
)
from backend.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["Users & Connections"])

def utc_now():
    return datetime.now(timezone.utc)

def pair_ids(id1: str, id2: str):
    return (min(id1, id2), max(id1, id2))


@router.get("/search", response_model=List[UserPublicProfile])
async def search_users(
    q: str = Query(..., min_length=1, max_length=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query_str = q.strip().lower()
    # Search for other verified users
    res = await db.execute(
        select(User)
        .where(User.id != current_user.id)
        .where(User.is_verified.is_(True))
        .where(User.is_active.is_(True))
        .where(User.privacy_profile_public.is_(True))
        .where(
            or_(
                User.username.ilike(f"%{query_str}%"),
                User.full_name.ilike(f"%{query_str}%")
            )
        )
        .limit(20)
    )
    users = res.scalars().all()

    # Determine connection status for each user found
    profiles = []
    for u in users:
        u_min, u_max = pair_ids(current_user.id, u.id)
        conn_res = await db.execute(
            select(UserConnection).where(
                UserConnection.user_a_id == u_min,
                UserConnection.user_b_id == u_max
            )
        )
        conn = conn_res.scalar_one_or_none()
        status_str = "none"

        if conn:
            if conn.is_blocked:
                status_str = "blocked"
            else:
                status_str = "connected"
        else:
            # Check communication requests
            req_res = await db.execute(
                select(CommunicationRequest).where(
                    or_(
                        and_(CommunicationRequest.sender_id == current_user.id, CommunicationRequest.receiver_id == u.id),
                        and_(CommunicationRequest.sender_id == u.id, CommunicationRequest.receiver_id == current_user.id)
                    )
                ).order_by(desc(CommunicationRequest.created_at))
            )
            latest_req = req_res.scalars().first()
            if latest_req and latest_req.status == "pending":
                if latest_req.sender_id == current_user.id:
                    status_str = "pending_sent"
                else:
                    status_str = "pending_received"

        profiles.append(
            UserPublicProfile(
                id=u.id,
                username=u.username,
                full_name=u.full_name,
                bio=u.bio,
                avatar_url=u.avatar_url,
                plan_type=u.plan_type,
                is_promotional_premium=u.is_promotional_premium,
                created_at=u.created_at,
                online_status=u.online_status,
                connection_status=status_str
            )
        )

    return profiles


@router.get("/profile/{username}", response_model=UserPublicProfile)
async def get_user_public_profile(
    username: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(User).where(User.username == username.strip().lower())
    )
    target = res.scalar_one_or_none()
    if not target or not target.is_active or not target.is_verified:
        raise HTTPException(status_code=404, detail="User not found.")

    u_min, u_max = pair_ids(current_user.id, target.id)
    conn_res = await db.execute(
        select(UserConnection).where(
            UserConnection.user_a_id == u_min,
            UserConnection.user_b_id == u_max
        )
    )
    conn = conn_res.scalar_one_or_none()
    status_str = "none"
    if conn:
        status_str = "blocked" if conn.is_blocked else "connected"

    return UserPublicProfile(
        id=target.id,
        username=target.username,
        full_name=target.full_name,
        bio=target.bio,
        avatar_url=target.avatar_url,
        plan_type=target.plan_type,
        is_promotional_premium=target.is_promotional_premium,
        created_at=target.created_at,
        online_status=target.online_status,
        connection_status=status_str
    )


@router.post("/requests", response_model=CommunicationRequestResponse)
async def send_communication_request(
    data: CommunicationRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    receiver_uname = data.receiver_username.strip().lower()
    if receiver_uname == current_user.username.lower():
        raise HTTPException(status_code=400, detail="Cannot send communication request to yourself.")

    rec_res = await db.execute(select(User).where(User.username == receiver_uname))
    receiver = rec_res.scalar_one_or_none()
    if not receiver or not receiver.is_active or not receiver.is_verified:
        raise HTTPException(status_code=404, detail=f"User '{receiver_uname}' not found.")

    u_min, u_max = pair_ids(current_user.id, receiver.id)
    # Check if already connected or blocked
    conn_res = await db.execute(
        select(UserConnection).where(UserConnection.user_a_id == u_min, UserConnection.user_b_id == u_max)
    )
    conn = conn_res.scalar_one_or_none()
    if conn:
        if conn.is_blocked:
            raise HTTPException(status_code=403, detail="Communication is restricted.")
        raise HTTPException(status_code=400, detail="You are already connected with this user.")

    # Check for existing pending request or cooldown
    req_res = await db.execute(
        select(CommunicationRequest).where(
            CommunicationRequest.sender_id == current_user.id,
            CommunicationRequest.receiver_id == receiver.id
        ).order_by(desc(CommunicationRequest.created_at))
    )
    existing_req = req_res.scalars().first()
    if existing_req:
        if existing_req.status == "pending":
            raise HTTPException(status_code=400, detail="A communication request is already pending.")
        if existing_req.cooldown_until and existing_req.cooldown_until > utc_now():
            remaining_mins = int((existing_req.cooldown_until - utc_now()).total_seconds() / 60)
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {remaining_mins} more minutes before sending another request to this user."
            )

    req = CommunicationRequest(
        sender_id=current_user.id,
        receiver_id=receiver.id,
        status="pending",
        note=data.note
    )
    db.add(req)

    # Notify receiver
    notif = Notification(
        user_id=receiver.id,
        type="request",
        title="New Connection Request",
        content=f"@{current_user.username} sent you a private communication request.",
        link="/dashboard/requests"
    )
    db.add(notif)
    await db.commit()
    await db.refresh(req)

    return CommunicationRequestResponse(
        id=req.id,
        sender_id=req.sender_id,
        receiver_id=req.receiver_id,
        status=req.status,
        note=req.note,
        created_at=req.created_at,
        sender_username=current_user.username,
        sender_full_name=current_user.full_name,
        receiver_username=receiver.username,
        receiver_full_name=receiver.full_name
    )


@router.get("/requests/incoming", response_model=List[CommunicationRequestResponse])
async def list_incoming_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(CommunicationRequest, User)
        .join(User, CommunicationRequest.sender_id == User.id)
        .where(
            CommunicationRequest.receiver_id == current_user.id,
            CommunicationRequest.status == "pending"
        )
        .order_by(desc(CommunicationRequest.created_at))
    )
    rows = res.all()
    results = []
    for req, sender in rows:
        results.append(
            CommunicationRequestResponse(
                id=req.id,
                sender_id=req.sender_id,
                receiver_id=req.receiver_id,
                status=req.status,
                note=req.note,
                created_at=req.created_at,
                sender_username=sender.username,
                sender_full_name=sender.full_name,
                receiver_username=current_user.username,
                receiver_full_name=current_user.full_name
            )
        )
    return results


@router.get("/requests/outgoing", response_model=List[CommunicationRequestResponse])
async def list_outgoing_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(CommunicationRequest, User)
        .join(User, CommunicationRequest.receiver_id == User.id)
        .where(
            CommunicationRequest.sender_id == current_user.id,
            CommunicationRequest.status == "pending"
        )
        .order_by(desc(CommunicationRequest.created_at))
    )
    rows = res.all()
    results = []
    for req, receiver in rows:
        results.append(
            CommunicationRequestResponse(
                id=req.id,
                sender_id=req.sender_id,
                receiver_id=req.receiver_id,
                status=req.status,
                note=req.note,
                created_at=req.created_at,
                sender_username=current_user.username,
                sender_full_name=current_user.full_name,
                receiver_username=receiver.username,
                receiver_full_name=receiver.full_name
            )
        )
    return results


@router.post("/requests/{request_id}/respond")
async def respond_to_request(
    request_id: str,
    action_data: CommunicationRequestAction,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(CommunicationRequest).where(
            CommunicationRequest.id == request_id,
            CommunicationRequest.receiver_id == current_user.id
        )
    )
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found or not addressed to you.")

    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {req.status}.")

    action = action_data.action.lower()
    u_min, u_max = pair_ids(req.sender_id, current_user.id)

    if action == "accept":
        req.status = "accepted"
        req.updated_at = utc_now()

        # Create or restore UserConnection
        conn_res = await db.execute(
            select(UserConnection).where(UserConnection.user_a_id == u_min, UserConnection.user_b_id == u_max)
        )
        conn = conn_res.scalar_one_or_none()
        if not conn:
            conn = UserConnection(
                user_a_id=u_min,
                user_b_id=u_max,
                is_blocked=False
            )
            db.add(conn)
        else:
            conn.is_blocked = False

        # Find if direct conversation already exists between these 2 users
        part_res = await db.execute(
            select(ConversationParticipant.conversation_id)
            .where(ConversationParticipant.user_id.in_([req.sender_id, current_user.id]))
            .group_by(ConversationParticipant.conversation_id)
            .having(func.count(ConversationParticipant.user_id) == 2)
        )
        existing_conv_id = part_res.scalars().first()

        if existing_conv_id:
            active_conv_id = existing_conv_id
        else:
            conv = Conversation(is_group=False)
            db.add(conv)
            await db.flush()

            p1 = ConversationParticipant(conversation_id=conv.id, user_id=req.sender_id)
            p2 = ConversationParticipant(conversation_id=conv.id, user_id=current_user.id)
            db.add_all([p1, p2])
            active_conv_id = conv.id

        # Notify original sender
        notif = Notification(
            user_id=req.sender_id,
            type="request",
            title="Request Accepted!",
            content=f"@{current_user.username} accepted your communication request. You can now chat securely.",
            link=f"/dashboard/messages?conversation={active_conv_id}"
        )
        db.add(notif)
        await db.commit()
        return {"message": "Request accepted. Connection created.", "conversation_id": active_conv_id}

    elif action == "reject":
        req.status = "rejected"
        # Anti-spam cooldown: 1 hour before sender can request again
        req.cooldown_until = utc_now() + timedelta(hours=1)
        req.updated_at = utc_now()
        await db.commit()
        return {"message": "Request rejected."}

    elif action == "block":
        req.status = "blocked"
        req.updated_at = utc_now()

        conn_res = await db.execute(
            select(UserConnection).where(UserConnection.user_a_id == u_min, UserConnection.user_b_id == u_max)
        )
        conn = conn_res.scalar_one_or_none()
        if not conn:
            conn = UserConnection(
                user_a_id=u_min,
                user_b_id=u_max,
                is_blocked=True,
                blocked_by_id=current_user.id
            )
            db.add(conn)
        else:
            conn.is_blocked = True
            conn.blocked_by_id = current_user.id

        await db.commit()
        return {"message": "User blocked."}

    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'accept', 'reject', or 'block'.")


@router.get("/connections", response_model=List[UserConnectionResponse])
async def list_user_connections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(UserConnection).where(
            or_(UserConnection.user_a_id == current_user.id, UserConnection.user_b_id == current_user.id)
        ).where(UserConnection.is_blocked.is_(False))
    )
    connections = res.scalars().all()

    results = []
    for c in connections:
        partner_id = c.user_b_id if c.user_a_id == current_user.id else c.user_a_id
        partner_res = await db.execute(select(User).where(User.id == partner_id))
        partner = partner_res.scalar_one_or_none()
        if partner:
            results.append(
                UserConnectionResponse(
                    id=c.id,
                    connected_user_id=partner.id,
                    connected_username=partner.username,
                    connected_full_name=partner.full_name,
                    connected_avatar_url=partner.avatar_url,
                    connected_online_status=partner.online_status,
                    is_blocked=c.is_blocked,
                    created_at=c.created_at
                )
            )
    return results


@router.post("/connections/{target_user_id}/block")
async def toggle_block_user(
    target_user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if target_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself.")

    u_min, u_max = pair_ids(current_user.id, target_user_id)
    res = await db.execute(
        select(UserConnection).where(UserConnection.user_a_id == u_min, UserConnection.user_b_id == u_max)
    )
    conn = res.scalar_one_or_none()

    if not conn:
        conn = UserConnection(
            user_a_id=u_min,
            user_b_id=u_max,
            is_blocked=True,
            blocked_by_id=current_user.id
        )
        db.add(conn)
        await db.commit()
        return {"message": "User blocked successfully.", "is_blocked": True}

    if conn.is_blocked:
        if conn.blocked_by_id != current_user.id:
            raise HTTPException(status_code=403, detail="Cannot unblock user blocked by the other party.")
        conn.is_blocked = False
        conn.blocked_by_id = None
        await db.commit()
        return {"message": "User unblocked successfully.", "is_blocked": False}
    else:
        conn.is_blocked = True
        conn.blocked_by_id = current_user.id
        await db.commit()
        return {"message": "User blocked successfully.", "is_blocked": True}
