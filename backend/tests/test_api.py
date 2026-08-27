import io
import pytest
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
    with TestClient(app) as client:
        # 1. Login
        login_res = client.post(
            "/api/auth/login",
            json={"email": "admin@securecloud.io", "password": "Password123!"}
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get Profile
        me_res = client.get("/api/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "admin@securecloud.io"

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
