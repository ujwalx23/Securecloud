import pytest
from backend.storage_service import StorageService

def test_storage_service_local_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setattr("backend.storage_service.STORAGE_BACKEND", "local")
    monkeypatch.setattr("backend.storage_service.STORAGE_DIR", tmp_path)
    
    svc = StorageService()
    test_data = b"ENCRYPTED_CIPHERTEXT_12345"
    key = "test_object.enc"
    
    # Save
    saved_path = svc.save_file(key, test_data)
    assert svc.file_exists(saved_path)
    
    # Read
    read_data = svc.get_file(saved_path)
    assert read_data == test_data
    
    # Delete
    assert svc.delete_file(saved_path)
    assert not svc.file_exists(saved_path)
