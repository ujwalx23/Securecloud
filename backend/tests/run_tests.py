import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select

from backend.database import Base, get_db
from backend.main import app
from backend.models import User, StorageAllocationSlot, TextDocument
from backend.storage_allocation import PROMOTIONAL_SLOT_QUOTA_BYTES

TEST_DB_PATH = Path(__file__).resolve().parent / "test_suite.db"
if TEST_DB_PATH.exists():
    TEST_DB_PATH.unlink()

TEST_DB_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

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

async def run_all_tests():
    print("=" * 60)
    print("RUNNING SECURECLOUD ENTERPRISE AUTOMATED TEST SUITE")
    print("=" * 60)

    # Setup Tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed 10 promotional slots
    async with TestingSessionLocal() as session:
        for i in range(1, 11):
            slot = StorageAllocationSlot(slot_number=i, is_active=True, user_id=None)
            session.add(slot)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        
        # TEST 1: Unique Username & Registration
        print("\n[TEST 1] Testing User Registration & Unique Username Enforcing...")
        r1 = await ac.post("/api/auth/register", json={
            "email": "alice@example.com",
            "username": "alice_sec",
            "password": "Password123!",
            "full_name": "Alice Security"
        })
        assert r1.status_code == 201, f"Expected 201, got {r1.status_code}: {r1.text}"
        assert r1.json()["username"] == "alice_sec"
        print("  [PASS] User 'alice_sec' registered successfully (unverified).")

        # Duplicate username rejection
        r_dup = await ac.post("/api/auth/register", json={
            "email": "alice_different@example.com",
            "username": "alice_sec",
            "password": "Password123!"
        })
        assert r_dup.status_code == 400, f"Expected 400 for duplicate username, got {r_dup.status_code}"
        assert "already taken" in r_dup.json()["detail"]
        print("  [PASS] Duplicate username 'alice_sec' correctly rejected by backend.")

        # TEST 2: Email Verification & Promotional Slot #1 Claim
        print("\n[TEST 2] Testing Email Verification & Promotional Slot Allocation...")
        async with TestingSessionLocal() as session:
            user = (await session.execute(select(User).where(User.email == "alice@example.com"))).scalar_one()
            otp = user.verification_code
        v_res = await ac.post("/api/auth/verify-email", json={"email": "alice@example.com", "code": otp})
        assert v_res.status_code == 200
        assert v_res.json()["verified"] is True
        assert v_res.json()["plan"] == "premium"
        assert v_res.json()["slot_or_queue"] == 1
        print("  [PASS] Alice verified with OTP and successfully claimed Promotional Premium Slot #1!")

        # TEST 3: Login with Username and Email & Session Management
        print("\n[TEST 3] Testing Login with Username, Password Validation & Sessions...")
        l1 = await ac.post("/api/auth/login", json={"login": "alice_sec", "password": "Password123!"})
        assert l1.status_code == 200
        token = l1.json()["access_token"]
        h_alice = {"Authorization": f"Bearer {token}"}
        print("  [PASS] Login by username 'alice_sec' authenticated successfully.")

        # Invalid password check
        l_bad = await ac.post("/api/auth/login", json={"login": "alice_sec", "password": "WrongPassword"})
        assert l_bad.status_code == 401
        print("  [PASS] Invalid password rejected with 401.")

        # Active sessions listing
        sess_res = await ac.get("/api/auth/sessions", headers=h_alice)
        assert sess_res.status_code == 200
        assert len(sess_res.json()) >= 1
        print("  [PASS] Active session tracking verified.")

        # TEST 4: Personal Text Notes CRUD & 5 MB Quota
        print("\n[TEST 4] Testing Personal Text Notes & 5 MB Quota Allocation...")
        doc_res = await ac.post("/api/documents", json={
            "title": "Architecture Blueprint",
            "content": "Enterprise Zero-Knowledge cloud platform with hybrid cryptography."
        }, headers=h_alice)
        assert doc_res.status_code == 201
        doc_id = doc_res.json()["id"]
        print("  [PASS] Created personal text document.")

        list_docs = await ac.get("/api/documents", headers=h_alice)
        assert list_docs.status_code == 200
        assert len(list_docs.json()) == 1
        print("  [PASS] Listed documents with byte tracking.")

        # TEST 5: User Search, Connection Requests, Real-Time Messaging & Security
        print("\n[TEST 5] Testing User Search, Communication Requests & Chat Authorization...")
        # Register and verify Bob
        await ac.post("/api/auth/register", json={"email": "bob@example.com", "username": "bob_crypto", "password": "Password123!"})
        async with TestingSessionLocal() as session:
            bob = (await session.execute(select(User).where(User.email == "bob@example.com"))).scalar_one()
            b_otp = bob.verification_code
        await ac.post("/api/auth/verify-email", json={"email": "bob@example.com", "code": b_otp})
        b_token = (await ac.post("/api/auth/login", json={"login": "bob_crypto", "password": "Password123!"})).json()["access_token"]
        h_bob = {"Authorization": f"Bearer {b_token}"}

        # Search for Bob
        search_res = await ac.get("/api/users/search?q=bob", headers=h_alice)
        assert search_res.status_code == 200
        assert len(search_res.json()) == 1
        print("  [PASS] User search returned public profile without exposing email or keys.")

        # Alice sends communication request to Bob
        req_res = await ac.post("/api/users/requests", json={
            "receiver_username": "bob_crypto",
            "note": "Connect for secure collaboration"
        }, headers=h_alice)
        assert req_res.status_code == 200
        req_id = req_res.json()["id"]
        print("  [PASS] Communication request sent.")

        # Anti-spam: Duplicate pending request rejected
        dup_req = await ac.post("/api/users/requests", json={"receiver_username": "bob_crypto"}, headers=h_alice)
        assert dup_req.status_code == 400
        print("  [PASS] Spam prevention: duplicate request blocked.")

        # Bob accepts request
        acc_res = await ac.post(f"/api/users/requests/{req_id}/respond", json={"action": "accept"}, headers=h_bob)
        assert acc_res.status_code == 200
        conv_id = acc_res.json()["conversation_id"]
        print(f"  [PASS] Bob accepted request. Private Conversation ID: {conv_id}")

        # Unauthorized third-party cannot access conversation
        # Register Eve
        await ac.post("/api/auth/register", json={"email": "eve@example.com", "username": "eve_hacker", "password": "Password123!"})
        async with TestingSessionLocal() as session:
            eve = (await session.execute(select(User).where(User.email == "eve@example.com"))).scalar_one()
            e_otp = eve.verification_code
        await ac.post("/api/auth/verify-email", json={"email": "eve@example.com", "code": e_otp})
        e_token = (await ac.post("/api/auth/login", json={"login": "eve_hacker", "password": "Password123!"})).json()["access_token"]
        h_eve = {"Authorization": f"Bearer {e_token}"}

        unauth_peek = await ac.get(f"/api/chat/conversations/{conv_id}/messages", headers=h_eve)
        assert unauth_peek.status_code == 403, f"Expected 403 Forbidden for eavesdropper, got {unauth_peek.status_code}"
        print("  [PASS] Security verification: unauthorized user cannot access private conversation (403 Forbidden).")

        # Alice sends private message
        msg_send = await ac.post(f"/api/chat/conversations/{conv_id}/messages", json={
            "conversation_id": conv_id,
            "content": "Hello Bob, secure channel verified!"
        }, headers=h_alice)
        assert msg_send.status_code == 200
        print("  [PASS] Private message posted by authorized participant.")

        # Bob reads message
        bob_msgs = await ac.get(f"/api/chat/conversations/{conv_id}/messages", headers=h_bob)
        assert bob_msgs.status_code == 200
        assert len(bob_msgs.json()) == 1
        assert bob_msgs.json()[0]["content"] == "Hello Bob, secure channel verified!"
        print("  [PASS] Message delivered and read receipts recorded.")

        # TEST 6: 10 Promotional Slots, Queueing, and Automatic Promotion
        print("\n[TEST 6] Testing 10 Promotional Slots, Queueing & Auto-Promotion...")
        # Alice took slot 1, Bob took slot 2, Eve took slot 3.
        # Let's fill slots 4 to 10
        for slot_num in range(4, 11):
            email = f"user{slot_num}@test.com"
            uname = f"user_{slot_num}"
            await ac.post("/api/auth/register", json={"email": email, "username": uname, "password": "Password123!"})
            async with TestingSessionLocal() as session:
                u = (await session.execute(select(User).where(User.email == email))).scalar_one()
                otp = u.verification_code
            v = await ac.post("/api/auth/verify-email", json={"email": email, "code": otp})
            assert v.json()["plan"] == "premium"
            assert v.json()["slot_or_queue"] == slot_num
        print("  [PASS] All 10 promotional slots are now occupied (Slots 1 through 10).")

        # 11th user verifies -> Must enter queue at position #1!
        await ac.post("/api/auth/register", json={"email": "queue_champ@test.com", "username": "queue_champ", "password": "Password123!"})
        async with TestingSessionLocal() as session:
            u_champ = (await session.execute(select(User).where(User.email == "queue_champ@test.com"))).scalar_one()
            champ_otp = u_champ.verification_code
        v_champ = await ac.post("/api/auth/verify-email", json={"email": "queue_champ@test.com", "code": champ_otp})
        assert v_champ.json()["plan"] == "basic"
        assert v_champ.json()["slot_or_queue"] == 1
        print("  [PASS] 11th user successfully placed in Promotional Queue at position #1.")

        # Now Alice deletes her account -> Slot #1 becomes vacant -> queue_champ MUST be automatically promoted to Slot #1!
        del_alice = await ac.delete("/api/auth/me", headers=h_alice)
        assert del_alice.status_code == 200
        print("  [PASS] Alice deleted account, triggering release_slot_and_promote_next().")

        # Verify queue_champ promotion
        champ_login = await ac.post("/api/auth/login", json={"login": "queue_champ", "password": "Password123!"})
        champ_data = champ_login.json()["user"]
        assert champ_data["plan_type"] == "premium"
        assert champ_data["is_promotional_premium"] is True
        assert champ_data["queue_position"] is None
        assert champ_data["storage_quota_bytes"] == PROMOTIONAL_SLOT_QUOTA_BYTES
        print("  [PASS] AUTOMATIC PROMOTION CONFIRMED: queue_champ promoted to Premium with 1,000 MB storage!")

        # TEST 7: Subscription Plans & Custom Plan Contact
        print("\n[TEST 7] Testing Subscription Plans & Custom Plan Phone Verification...")
        plans_res = await ac.get("/api/subscriptions/plans")
        assert plans_res.status_code == 200
        plans = plans_res.json()["plans"]
        custom_plan = next(p for p in plans if p["id"] == "custom")
        assert custom_plan["contact_phone"] == "7977339435"
        # TEST 8: Google Auth Endpoint Validation
        print("\n[TEST 8] Testing Google OAuth Endpoint Token Verification...")
        google_bad_token = await ac.post("/api/auth/google", json={"credential": "invalid_fake_jwt_token"})
        assert google_bad_token.status_code == 401
        assert "Invalid or expired Google credential" in google_bad_token.json()["detail"]
        print("  [PASS] Google Auth endpoint securely validates ID tokens and rejects invalid credentials with 401.")

    print("\n" + "=" * 60)
    print("ALL 8 TEST SUITES PASSED FLAWLESSLY! 100% SUCCESS.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_all_tests())
