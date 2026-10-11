import os
import io
import pytest

# Ensure tests run against isolated local SQLite database
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./backend/test_cache.db"
os.environ["STORAGE_BACKEND"] = "local"

from fastapi.testclient import TestClient
from backend.main import app

def test_root_health():
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "online"

def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

def test_full_user_workflow():
    import time
    test_email = f"user_{int(time.time()*1000)}@securecloud.io"
    with TestClient(app) as client:
        # 1. Register
        reg_res = client.post(
            "/api/auth/register",
            json={"email": test_email, "password": "SecurePassword123!", "full_name": "Production User"}
        )
        assert reg_res.status_code == 201

        # Check unverified login is blocked with 403
        unverified_login = client.post(
            "/api/auth/login",
            json={"email": test_email, "password": "SecurePassword123!"}
        )
        assert unverified_login.status_code == 403

        # Retrieve verification code from DB and verify
        import asyncio
        from backend.database import AsyncSessionLocal
        from backend.models import User
        from sqlalchemy import select

        async def get_user_code():
            async with AsyncSessionLocal() as session:
                res = await session.execute(select(User).where(User.email == test_email))
                return res.scalar_one().verification_code

        code = asyncio.run(get_user_code())
        verify_res = client.post(
            "/api/auth/verify-email",
            json={"email": test_email, "code": code}
        )
        assert verify_res.status_code == 200

        # Now login succeeds
        login_res = client.post(
            "/api/auth/login",
            json={"email": test_email, "password": "SecurePassword123!"}
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get Profile
        me_res = client.get("/api/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["email"] == test_email

        # 3. Create Folder
        folder_res = client.post(
            "/api/folders",
            json={"name": "Confidential Documents", "color": "#00f2fe"},
            headers=headers
        )
        assert folder_res.status_code == 201
        folder_id = folder_res.json()["id"]

        # 4. Upload File
        file_content = b"TOP SECRET CLOUD STORAGE DATA 2026"
        file_tuple = ("secret.txt", io.BytesIO(file_content), "text/plain")
        upload_res = client.post(
            "/api/files/upload",
            data={"folder_id": folder_id, "is_encrypted": "true"},
            files={"file": file_tuple},
            headers=headers
        )
        assert upload_res.status_code == 201
        file_id = upload_res.json()["id"]

        # 5. Download and Decrypt File
        download_res = client.get(f"/api/files/{file_id}/download", headers=headers)
        assert download_res.status_code == 200
        assert download_res.content == file_content

        # 6. Add Vault Secret
        vault_res = client.post(
            "/api/vault",
            json={"title": "Master Database Password", "secret_type": "password", "payload": "SuperSecretKey99!"},
            headers=headers
        )
        assert vault_res.status_code == 201

        # 7. Get Storage Stats Summary
        stats_res = client.get("/api/stats/summary", headers=headers)
        assert stats_res.status_code == 200
        assert stats_res.json()["file_count"] >= 1

def test_email_verification_edge_cases():
    import time
    test_email = f"verify_{int(time.time()*1000)}@securecloud.io"
    with TestClient(app) as client:
        # Register
        client.post(
            "/api/auth/register",
            json={"email": test_email, "password": "StrongPassword999!", "full_name": "Verification Tester"}
        )

        # 1. Incorrect OTP code rejected
        bad_verify = client.post(
            "/api/auth/verify-email",
            json={"email": test_email, "code": "000000"}
        )
        assert bad_verify.status_code == 400
        assert "Invalid" in bad_verify.json()["detail"]

        # 2. Resend OTP code works
        resend_res = client.post(
            "/api/auth/resend-code",
            json={"email": test_email}
        )
        assert resend_res.status_code == 200

        # Retrieve new code from DB
        import asyncio
        from backend.database import AsyncSessionLocal
        from backend.models import User
        from sqlalchemy import select

        async def get_user_code():
            async with AsyncSessionLocal() as session:
                res = await session.execute(select(User).where(User.email == test_email))
                return res.scalar_one().verification_code

        code = asyncio.run(get_user_code())
        assert len(code) == 6

        # 3. Correct code verifies
        good_verify = client.post(
            "/api/auth/verify-email",
            json={"email": test_email, "code": code}
        )
        assert good_verify.status_code == 200
        assert good_verify.json()["verified"] is True

