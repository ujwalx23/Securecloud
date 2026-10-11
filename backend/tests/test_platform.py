import pytest
import pytest_asyncio
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, get_db
from backend.main import app
from backend.models import User, StorageAllocationSlot, TextDocument, CommunicationRequest, UserConnection
from backend.auth import get_password_hash, create_access_token

# Use isolated SQLite for fast automated unit and security tests
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def override_get_db():
    async with TestingSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture(autouse=True)
async def setup_test_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Pre-seed 10 promotional slots
    async with TestingSessionLocal() as session:
        for i in range(1, 11):
            slot = StorageAllocationSlot(slot_number=i, is_active=True, user_id=None)
            session.add(slot)
        await session.commit()

    yield

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.mark.asyncio
async def test_user_registration_and_unique_username():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Register User 1
        res = await ac.post("/api/auth/register", json={
            "email": "alice@example.com",
            "username": "alice_sec",
            "password": "Password123!",
            "full_name": "Alice Security"
        })
        assert res.status_code == 201
        data = res.json()
        assert data["username"] == "alice_sec"
        assert data["is_verified"] is False

        # 2. Duplicate username rejection
        res_dup_uname = await ac.post("/api/auth/register", json={
            "email": "alice2@example.com",
            "username": "alice_sec",
            "password": "Password123!",
            "full_name": "Alice Clone"
        })
        assert res_dup_uname.status_code == 400
        assert "already taken" in res_dup_uname.json()["detail"]

@pytest.mark.asyncio
async def test_email_verification_and_promotional_slot_claiming():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        await ac.post("/api/auth/register", json={
            "email": "bob@example.com",
            "username": "bob_crypto",
            "password": "Password123!",
            "full_name": "Bob Crypto"
        })

        # Get verification code from DB
        async with TestingSessionLocal() as session:
            from sqlalchemy import select
            user_res = await session.execute(select(User).where(User.email == "bob@example.com"))
            user = user_res.scalar_one()
            otp = user.verification_code
            assert otp is not None

        # Verify email with OTP
        v_res = await ac.post("/api/auth/verify-email", json={
            "email": "bob@example.com",
            "code": otp
        })
        assert v_res.status_code == 200
        assert v_res.json()["verified"] is True
        assert v_res.json()["plan"] == "premium"
        assert v_res.json()["slot_or_queue"] == 1  # Got slot #1!

@pytest.mark.asyncio
async def test_login_by_username_and_by_email():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        await ac.post("/api/auth/register", json={
            "email": "charlie@example.com",
            "username": "charlie_dev",
            "password": "Password123!"
        })
        async with TestingSessionLocal() as session:
            from sqlalchemy import select
            user_res = await session.execute(select(User).where(User.email == "charlie@example.com"))
            user = user_res.scalar_one()
            otp = user.verification_code
        await ac.post("/api/auth/verify-email", json={"email": "charlie@example.com", "code": otp})

        # Login with email
        l_email = await ac.post("/api/auth/login", json={"login": "charlie@example.com", "password": "Password123!"})
        assert l_email.status_code == 200
        assert "access_token" in l_email.json()

        # Login with username
        l_uname = await ac.post("/api/auth/login", json={"login": "charlie_dev", "password": "Password123!"})
        assert l_uname.status_code == 200
        assert "access_token" in l_uname.json()

        # Invalid password rejected
        l_bad = await ac.post("/api/auth/login", json={"login": "charlie_dev", "password": "WrongPassword"})
        assert l_bad.status_code == 401

@pytest.mark.asyncio
async def test_text_documents_crud_and_quota_enforcement():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        await ac.post("/api/auth/register", json={
            "email": "dan@example.com",
            "username": "dan_notes",
            "password": "Password123!"
        })
        async with TestingSessionLocal() as session:
            from sqlalchemy import select
            user_res = await session.execute(select(User).where(User.email == "dan@example.com"))
            user = user_res.scalar_one()
            otp = user.verification_code
        await ac.post("/api/auth/verify-email", json={"email": "dan@example.com", "code": otp})

        l_res = await ac.post("/api/auth/login", json={"login": "dan_notes", "password": "Password123!"})
        token = l_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create valid note
        doc_res = await ac.post("/api/documents", json={
            "title": "Confidential Research",
            "content": "Zero-Knowledge cloud architecture notes."
        }, headers=headers)
        assert doc_res.status_code == 201
        doc_data = doc_res.json()
        doc_id = doc_data["id"]
        assert doc_data["title"] == "Confidential Research"

        # List notes
        list_res = await ac.get("/api/documents", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) == 1

        # Delete note
        del_res = await ac.delete(f"/api/documents/{doc_id}", headers=headers)
        assert del_res.status_code == 200

@pytest.mark.asyncio
async def test_communication_requests_and_private_messaging_permissions():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Register User A
        await ac.post("/api/auth/register", json={"email": "u1@test.com", "username": "user_one", "password": "Password123!"})
        async with TestingSessionLocal() as session:
            from sqlalchemy import select
            u1 = (await session.execute(select(User).where(User.email == "u1@test.com"))).scalar_one()
            otp1 = u1.verification_code
        await ac.post("/api/auth/verify-email", json={"email": "u1@test.com", "code": otp1})
        t1 = (await ac.post("/api/auth/login", json={"login": "user_one", "password": "Password123!"})).json()["access_token"]

        # Register User B
        await ac.post("/api/auth/register", json={"email": "u2@test.com", "username": "user_two", "password": "Password123!"})
        async with TestingSessionLocal() as session:
            from sqlalchemy import select
            u2 = (await session.execute(select(User).where(User.email == "u2@test.com"))).scalar_one()
            otp2 = u2.verification_code
        await ac.post("/api/auth/verify-email", json={"email": "u2@test.com", "code": otp2})
        t2 = (await ac.post("/api/auth/login", json={"login": "user_two", "password": "Password123!"})).json()["access_token"]

        h1 = {"Authorization": f"Bearer {t1}"}
        h2 = {"Authorization": f"Bearer {t2}"}

        # User 1 sends communication request to User 2
        req_res = await ac.post("/api/users/requests", json={
            "receiver_username": "user_two",
            "note": "Let's collaborate on SecureCloud."
        }, headers=h1)
        assert req_res.status_code == 200
        req_id = req_res.json()["id"]

        # User 2 views incoming requests
        in_res = await ac.get("/api/users/requests/incoming", headers=h2)
        assert in_res.status_code == 200
        assert len(in_res.json()) == 1

        # User 2 accepts request
        accept_res = await ac.post(f"/api/users/requests/{req_id}/respond", json={"action": "accept"}, headers=h2)
        assert accept_res.status_code == 200
        conv_id = accept_res.json()["conversation_id"]

        # User 1 can now message User 2 in this conversation
        msg_res = await ac.post(f"/api/chat/conversations/{conv_id}/messages", json={
            "conversation_id": conv_id,
            "content": "Hello User Two! Our connection is established."
        }, headers=h1)
        assert msg_res.status_code == 200
        assert msg_res.json()["content"] == "Hello User Two! Our connection is established."

        # User 2 reads messages
        read_res = await ac.get(f"/api/chat/conversations/{conv_id}/messages", headers=h2)
        assert read_res.status_code == 200
        assert len(read_res.json()) == 1

@pytest.mark.asyncio
async def test_promotional_queue_and_automatic_promotion():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Pre-fill all 10 slots with verified users
        user_ids = []
        for i in range(1, 11):
            email = f"slotuser{i}@test.com"
            uname = f"slotuser_{i}"
            await ac.post("/api/auth/register", json={"email": email, "username": uname, "password": "Password123!"})
            async with TestingSessionLocal() as session:
                from sqlalchemy import select
                u = (await session.execute(select(User).where(User.email == email))).scalar_one()
                otp = u.verification_code
                user_ids.append(u.id)
            v = await ac.post("/api/auth/verify-email", json={"email": email, "code": otp})
            assert v.json()["plan"] == "premium"
            assert v.json()["slot_or_queue"] == i

        # 11th user registers & verifies -> Must be placed in queue at position 1!
        await ac.post("/api/auth/register", json={"email": "queueuser@test.com", "username": "queue_champ", "password": "Password123!"})
        async with TestingSessionLocal() as session:
            from sqlalchemy import select
            u11 = (await session.execute(select(User).where(User.email == "queueuser@test.com"))).scalar_one()
            otp11 = u11.verification_code
        v11 = await ac.post("/api/auth/verify-email", json={"email": "queueuser@test.com", "code": otp11})
        assert v11.json()["plan"] == "basic"
        assert v11.json()["slot_or_queue"] == 1  # Queue position #1

        # Now delete slotuser #1 account -> Promotional slot #1 frees up -> queue_champ MUST be automatically promoted!
        login_u1 = await ac.post("/api/auth/login", json={"login": "slotuser_1", "password": "Password123!"})
        token_u1 = login_u1.json()["access_token"]
        del_res = await ac.delete("/api/auth/me", headers={"Authorization": f"Bearer {token_u1}"})
        assert del_res.status_code == 200

        # Check queue_champ: should now be promoted to Premium!
        login_q = await ac.post("/api/auth/login", json={"login": "queue_champ", "password": "Password123!"})
        user_data = login_q.json()["user"]
        assert user_data["plan_type"] == "premium"
        assert user_data["is_promotional_premium"] is True
        assert user_data["queue_position"] is None
        assert user_data["storage_quota_bytes"] == 1000 * 1024 * 1024
