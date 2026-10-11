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
from backend.models import User, StorageAllocationSlot
from backend.storage_allocation import PREMIUM_1GB_QUOTA_BYTES

TEST_DB_PATH = Path(__file__).resolve().parent / "test_new_features.db"
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

async def run_feature_tests():
    print("=" * 60)
    print("VERIFYING NEW FEATURES: MASTER PASSWORD OTP & 1GB SUBSCRIPTIONS")
    print("=" * 60)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        
        # 1. Register a Google/Regular User
        reg = await ac.post("/api/auth/register", json={
            "email": "testuser@cloud.com",
            "username": "testuser",
            "password": "InitialPass123!"
        })
        assert reg.status_code == 201

        # Get verification code
        async with TestingSessionLocal() as s:
            u = (await s.execute(select(User).where(User.email == "testuser@cloud.com"))).scalar_one()
            otp = u.verification_code
        
        v = await ac.post("/api/auth/verify-email", json={"email": "testuser@cloud.com", "code": otp})
        assert v.status_code == 200

        # Login to get token
        login = await ac.post("/api/auth/login", json={"login": "testuser", "password": "InitialPass123!"})
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # TEST A: Send Password OTP
        print("\n[TEST A] Requesting Master Password Setup OTP...")
        send_otp_res = await ac.post("/api/auth/send-password-otp", json={"email": "testuser@cloud.com"}, headers=headers)
        assert send_otp_res.status_code == 200
        print("  [PASS] 6-digit OTP request processed successfully.")

        # Read generated OTP from DB
        async with TestingSessionLocal() as s:
            u = (await s.execute(select(User).where(User.email == "testuser@cloud.com"))).scalar_one()
            pwd_otp = u.verification_code
            assert pwd_otp is not None and len(pwd_otp) == 6

        # TEST B: Set Master Password with OTP
        print("\n[TEST B] Setting Master Password using 6-Digit OTP...")
        set_pwd_res = await ac.post("/api/auth/set-password-with-otp", json={
            "otp_code": pwd_otp,
            "new_password": "NewMasterSecretPassword99!"
        }, headers=headers)
        if set_pwd_res.status_code != 200:
            print("FAILED set_pwd_res:", set_pwd_res.status_code, set_pwd_res.text)
        assert set_pwd_res.status_code == 200
        print("  [PASS] Master Password set successfully via OTP.")

        # Verify login with new master password
        new_login = await ac.post("/api/auth/login", json={
            "login": "testuser",
            "password": "NewMasterSecretPassword99!"
        })
        assert new_login.status_code == 200
        new_token = new_login.json()["access_token"]
        new_headers = {"Authorization": f"Bearer {new_token}"}
        print("  [PASS] Successfully logged in with the new Master Password!")

        # TEST C: 30-Day Free Trial of Premium (1 GB)
        print("\n[TEST C] Activating 30-Day Free Trial (1 GB)...")
        trial_res = await ac.post("/api/subscriptions/start-trial", headers=new_headers)
        assert trial_res.status_code == 200
        trial_data = trial_res.json()
        assert trial_data["plan"] == "premium"
        assert trial_data["storage_quota_bytes"] == PREMIUM_1GB_QUOTA_BYTES
        print("  [PASS] 30-Day Free Trial activated with exactly 1 GB storage quota.")

        # Test duplicate trial blocked
        trial_dup = await ac.post("/api/subscriptions/start-trial", headers=new_headers)
        assert trial_dup.status_code == 400
        print("  [PASS] Duplicate free trial prevented.")

        # TEST D: Stripe Checkout for INR 399/year
        print("\n[TEST D] Processing Stripe Checkout (INR 399/yr)...")
        stripe_res = await ac.post("/api/subscriptions/checkout-stripe", json={
            "card_number": "4242424242424242",
            "exp_month": "12",
            "exp_year": "28",
            "cvc": "999",
            "name_on_card": "Test Subscriber",
            "postal_code": "10001"
        }, headers=new_headers)
        assert stripe_res.status_code == 200
        stripe_data = stripe_res.json()
        assert stripe_data["plan"] == "premium"
        assert stripe_data["storage_quota_bytes"] == PREMIUM_1GB_QUOTA_BYTES
        assert "INV-" in stripe_data["receipt_number"]
        print(f"  [PASS] Stripe Payment of INR 399 processed! Receipt: {stripe_data['receipt_number']}.")

        # TEST E: Check subscription status response
        print("\n[TEST E] Checking Subscription Status & 1 GB Quota Response...")
        st_res = await ac.get("/api/subscriptions/status", headers=new_headers)
        assert st_res.status_code == 200
        st_data = st_res.json()
        assert st_data["current_plan"] == "premium"
        assert st_data["storage_quota_bytes"] == PREMIUM_1GB_QUOTA_BYTES
        assert st_data["custom_plan_contact"] == "ujwalsingh164@gmail.com"
        print("  [PASS] Status reports Premium (1 GB) and contact points to ujwalsingh164@gmail.com.")

    print("\n" + "=" * 60)
    print("ALL NEW FEATURE TESTS PASSED 100%!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_feature_tests())
