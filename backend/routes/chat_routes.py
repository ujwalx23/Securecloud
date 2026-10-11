import json
from datetime import datetime, timezone
from typing import List, Dict, Set, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc, func
from jose import jwt, JWTError

from backend.config import JWT_SECRET_KEY, ALGORITHM
from backend.database import get_db, AsyncSessionLocal
from backend.models import (
    User,
    Conversation,
    ConversationParticipant,
    ChatMessage,
    UserConnection,
    FileItem,
    Notification
)
from backend.schemas import (
    ConversationCreate,
    MessageSend,
    MessageEdit,
    ChatMessageResponse,
    ConversationResponse
)
from backend.auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["Private Chat"])

def utc_now():
    return datetime.now(timezone.utc)


# Real-time WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        # Maps conversation_id -> set of active WebSockets
        self.active_rooms: Dict[str, Set[WebSocket]] = {}

    async def connect(self, conv_id: str, websocket: WebSocket):
        await websocket.accept()
        if conv_id not in self.active_rooms:
            self.active_rooms[conv_id] = set()
        self.active_rooms[conv_id].add(websocket)

    def disconnect(self, conv_id: str, websocket: WebSocket):
        if conv_id in self.active_rooms:
            self.active_rooms[conv_id].discard(websocket)
            if not self.active_rooms[conv_id]:
                del self.active_rooms[conv_id]

    async def broadcast_to_conversation(self, conv_id: str, message_data: dict):
        if conv_id in self.active_rooms:
            dead_sockets = set()
            for ws in self.active_rooms[conv_id]:
                try:
                    await ws.send_text(json.dumps(message_data))
                except Exception:
                    dead_sockets.add(ws)
            for ws in dead_sockets:
                self.disconnect(conv_id, ws)

manager = ConnectionManager()


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Find all conversations current_user participates in
    part_res = await db.execute(
        select(ConversationParticipant.conversation_id)
        .where(ConversationParticipant.user_id == current_user.id)
    )
    conv_ids = [r[0] for r in part_res.all()]

    if not conv_ids:
        return []

    # Query conversations ordered by latest update
    conv_res = await db.execute(
        select(Conversation)
        .where(Conversation.id.in_(conv_ids))
        .order_by(desc(Conversation.updated_at))
    )
    conversations = conv_res.scalars().all()

    result = []
    for conv in conversations:
        # Get all participants
        p_res = await db.execute(
            select(ConversationParticipant, User)
            .join(User, ConversationParticipant.user_id == User.id)
            .where(ConversationParticipant.conversation_id == conv.id)
        )
        participants_data = []
        my_last_read = None
        for p, u in p_res.all():
            if u.id == current_user.id:
                my_last_read = p.last_read_at
            participants_data.append({
                "user_id": u.id,
                "username": u.username,
                "full_name": u.full_name,
                "avatar_url": u.avatar_url,
                "online_status": u.online_status
            })

        # Get last message
        last_msg_res = await db.execute(
            select(ChatMessage, User)
            .join(User, ChatMessage.sender_id == User.id)
            .where(ChatMessage.conversation_id == conv.id)
            .order_by(desc(ChatMessage.created_at))
            .limit(1)
        )
        last_msg_row = last_msg_res.first()
        last_msg_dict = None
        if last_msg_row:
            m, sender = last_msg_row
            last_msg_dict = {
                "id": m.id,
                "sender_id": m.sender_id,
                "sender_username": sender.username,
                "content": "[Deleted message]" if m.is_deleted else m.content,
                "created_at": m.created_at.isoformat()
            }

        # Calculate unread count
        unread_count = 0
        if my_last_read:
            unread_res = await db.execute(
                select(func.count(ChatMessage.id))
                .where(ChatMessage.conversation_id == conv.id)
                .where(ChatMessage.sender_id != current_user.id)
                .where(ChatMessage.created_at > my_last_read)
            )
            unread_count = unread_res.scalar() or 0

        result.append(
            ConversationResponse(
                id=conv.id,
                title=conv.title,
                is_group=conv.is_group,
                updated_at=conv.updated_at,
                participants=participants_data,
                last_message=last_msg_dict,
                unread_count=unread_count
            )
        )

    return result


@router.post("/conversations", response_model=Dict[str, Any])
async def create_or_get_direct_conversation(
    data: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    recipient_id = data.recipient_id.strip()
    if recipient_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot start conversation with yourself.")

    # Check recipient exists
    rec_res = await db.execute(select(User).where(User.id == recipient_id))
    recipient = rec_res.scalar_one_or_none()
    if not recipient or not recipient.is_active:
        raise HTTPException(status_code=404, detail="Recipient not found.")

    # Check if connection exists and neither has blocked the other
    u_min, u_max = min(current_user.id, recipient_id), max(current_user.id, recipient_id)
    conn_res = await db.execute(
        select(UserConnection).where(UserConnection.user_a_id == u_min, UserConnection.user_b_id == u_max)
    )
    conn = conn_res.scalar_one_or_none()
    if not conn:
        raise HTTPException(
            status_code=403,
            detail="You must send and have an accepted communication request before chatting."
        )
    if conn.is_blocked:
        raise HTTPException(status_code=403, detail="Communication is blocked.")

    # Check for existing 1-on-1 conversation
    conv_candidates = await db.execute(
        select(ConversationParticipant.conversation_id)
        .where(ConversationParticipant.user_id.in_([current_user.id, recipient_id]))
        .group_by(ConversationParticipant.conversation_id)
        .having(func.count(ConversationParticipant.user_id) == 2)
    )
    existing_conv_id = conv_candidates.scalars().first()
    if existing_conv_id:
        return {"conversation_id": existing_conv_id, "is_new": False}

    # Create new conversation
    new_conv = Conversation(is_group=False)
    db.add(new_conv)
    await db.flush()

    p1 = ConversationParticipant(conversation_id=new_conv.id, user_id=current_user.id)
    p2 = ConversationParticipant(conversation_id=new_conv.id, user_id=recipient_id)
    db.add_all([p1, p2])
    await db.commit()

    return {"conversation_id": new_conv.id, "is_new": True}


@router.get("/conversations/{conv_id}/messages", response_model=List[ChatMessageResponse])
async def get_conversation_messages(
    conv_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify participant authorization
    part_res = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conv_id,
            ConversationParticipant.user_id == current_user.id
        )
    )
    participant = part_res.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=403, detail="Not authorized to view messages in this conversation.")

    # Update last_read_at timestamp
    participant.last_read_at = utc_now()

    # Query messages
    msg_res = await db.execute(
        select(ChatMessage, User)
        .join(User, ChatMessage.sender_id == User.id)
        .where(ChatMessage.conversation_id == conv_id)
        .order_by(desc(ChatMessage.created_at))
        .offset(offset)
        .limit(limit)
    )
    rows = msg_res.all()
    await db.commit()

    results = []
    # Reverse to return chronological order
    for msg, sender in reversed(rows):
        attach_info = None
        if msg.attachment_file_id:
            file_res = await db.execute(select(FileItem).where(FileItem.id == msg.attachment_file_id))
            file_item = file_res.scalar_one_or_none()
            if file_item:
                attach_info = {
                    "id": file_item.id,
                    "original_name": file_item.original_name,
                    "file_size": file_item.file_size,
                    "mime_type": file_item.mime_type
                }

        results.append(
            ChatMessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                sender_id=msg.sender_id,
                sender_username=sender.username,
                sender_avatar_url=sender.avatar_url,
                content="[Message deleted]" if msg.is_deleted else msg.content,
                is_edited=msg.is_edited,
                edited_at=msg.edited_at,
                is_deleted=msg.is_deleted,
                attachment_file_id=msg.attachment_file_id,
                attachment_info=attach_info,
                created_at=msg.created_at
            )
        )

    return results


@router.post("/conversations/{conv_id}/messages", response_model=ChatMessageResponse)
async def send_message(
    conv_id: str,
    data: MessageSend,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify participant authorization
    part_res = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conv_id,
            ConversationParticipant.user_id == current_user.id
        )
    )
    if not part_res.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not authorized to send messages in this conversation.")

    # Check recipient blocked status
    all_participants = await db.execute(
        select(ConversationParticipant.user_id).where(
            ConversationParticipant.conversation_id == conv_id,
            ConversationParticipant.user_id != current_user.id
        )
    )
    other_user_ids = all_participants.scalars().all()
    for other_id in other_user_ids:
        u_min, u_max = min(current_user.id, other_id), max(current_user.id, other_id)
        conn_res = await db.execute(
            select(UserConnection).where(UserConnection.user_a_id == u_min, UserConnection.user_b_id == u_max)
        )
        conn = conn_res.scalar_one_or_none()
        if conn and conn.is_blocked:
            raise HTTPException(status_code=403, detail="Cannot send messages: connection is blocked.")

    # Validate attachment if provided
    attach_info = None
    if data.attachment_file_id:
        f_res = await db.execute(
            select(FileItem).where(
                FileItem.id == data.attachment_file_id,
                FileItem.user_id == current_user.id
            )
        )
        file_item = f_res.scalar_one_or_none()
        if not file_item:
            raise HTTPException(status_code=400, detail="Attachment file not found or not owned by you.")
        attach_info = {
            "id": file_item.id,
            "original_name": file_item.original_name,
            "file_size": file_item.file_size,
            "mime_type": file_item.mime_type
        }

    # Create message
    msg = ChatMessage(
        conversation_id=conv_id,
        sender_id=current_user.id,
        content=data.content.strip(),
        attachment_file_id=data.attachment_file_id
    )
    db.add(msg)

    # Touch conversation updated_at
    conv_res = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = conv_res.scalar_one()
    conv.updated_at = utc_now()

    # Send notification to other participants
    for other_id in other_user_ids:
        notif = Notification(
            user_id=other_id,
            type="message",
            title=f"New message from @{current_user.username}",
            content=data.content.strip()[:100],
            link=f"/dashboard/messages?conversation={conv_id}"
        )
        db.add(notif)

    await db.commit()
    await db.refresh(msg)

    resp_payload = {
        "id": msg.id,
        "conversation_id": msg.conversation_id,
        "sender_id": msg.sender_id,
        "sender_username": current_user.username,
        "sender_avatar_url": current_user.avatar_url,
        "content": msg.content,
        "is_edited": msg.is_edited,
        "edited_at": None,
        "is_deleted": msg.is_deleted,
        "attachment_file_id": msg.attachment_file_id,
        "attachment_info": attach_info,
        "created_at": msg.created_at.isoformat()
    }

    # Broadcast to live WebSocket connections in this conversation room
    await manager.broadcast_to_conversation(conv_id, {"type": "new_message", "message": resp_payload})

    return ChatMessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender_username=current_user.username,
        sender_avatar_url=current_user.avatar_url,
        content=msg.content,
        is_edited=msg.is_edited,
        edited_at=msg.edited_at,
        is_deleted=msg.is_deleted,
        attachment_file_id=msg.attachment_file_id,
        attachment_info=attach_info,
        created_at=msg.created_at
    )


@router.put("/messages/{message_id}", response_model=ChatMessageResponse)
async def edit_message(
    message_id: str,
    data: MessageEdit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    msg_res = await db.execute(
        select(ChatMessage).where(ChatMessage.id == message_id, ChatMessage.sender_id == current_user.id)
    )
    msg = msg_res.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found or you are not the sender.")

    if msg.is_deleted:
        raise HTTPException(status_code=400, detail="Cannot edit a deleted message.")

    msg.content = data.content.strip()
    msg.is_edited = True
    msg.edited_at = utc_now()
    await db.commit()
    await db.refresh(msg)

    update_payload = {
        "type": "message_edited",
        "message_id": msg.id,
        "conversation_id": msg.conversation_id,
        "content": msg.content,
        "edited_at": msg.edited_at.isoformat()
    }
    await manager.broadcast_to_conversation(msg.conversation_id, update_payload)

    return ChatMessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender_username=current_user.username,
        sender_avatar_url=current_user.avatar_url,
        content=msg.content,
        is_edited=msg.is_edited,
        edited_at=msg.edited_at,
        is_deleted=msg.is_deleted,
        attachment_file_id=msg.attachment_file_id,
        created_at=msg.created_at
    )


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    msg_res = await db.execute(
        select(ChatMessage).where(ChatMessage.id == message_id, ChatMessage.sender_id == current_user.id)
    )
    msg = msg_res.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found or you are not the sender.")

    msg.is_deleted = True
    msg.content = "[Message deleted]"
    await db.commit()

    delete_payload = {
        "type": "message_deleted",
        "message_id": msg.id,
        "conversation_id": msg.conversation_id
    }
    await manager.broadcast_to_conversation(msg.conversation_id, delete_payload)
    return {"message": "Message deleted."}


# Real-Time WebSocket Endpoint
@router.websocket("/ws/{conv_id}")
async def chat_websocket(
    websocket: WebSocket,
    conv_id: str,
    token: str = Query(...)
):
    # Verify JWT Token
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Verify conversation participation
    async with AsyncSessionLocal() as db:
        part_res = await db.execute(
            select(ConversationParticipant).where(
                ConversationParticipant.conversation_id == conv_id,
                ConversationParticipant.user_id == user_id
            )
        )
        if not part_res.scalar_one_or_none():
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await manager.connect(conv_id, websocket)
    try:
        while True:
            # Keep socket alive and handle typing signals
            data_text = await websocket.receive_text()
            try:
                data = json.loads(data_text)
                if data.get("type") == "typing":
                    await manager.broadcast_to_conversation(conv_id, {
                        "type": "typing",
                        "user_id": user_id,
                        "is_typing": bool(data.get("is_typing", True))
                    })
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(conv_id, websocket)
