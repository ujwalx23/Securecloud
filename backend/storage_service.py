import os
import io
import logging
from pathlib import Path
from typing import Optional

from backend.config import (
    STORAGE_DIR,
    STORAGE_BACKEND,
    S3_ENDPOINT_URL,
    S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY,
    S3_BUCKET_NAME,
    S3_REGION_NAME
)

logger = logging.getLogger("securecloud.storage")

class StorageService:
    def __init__(self):
        self.backend = (STORAGE_BACKEND or "local").lower()
        self._s3_client = None

        if self.backend in ("s3", "r2"):
            try:
                import boto3
                from botocore.config import Config

                session_kwargs = {
                    "aws_access_key_id": S3_ACCESS_KEY_ID,
                    "aws_secret_access_key": S3_SECRET_ACCESS_KEY,
                    "region_name": S3_REGION_NAME or "auto",
                }
                
                client_kwargs = {
                    "service_name": "s3",
                    "config": Config(
                        signature_version="s3v4",
                        retries={"max_attempts": 3, "mode": "standard"}
                    )
                }

                if S3_ENDPOINT_URL:
                    client_kwargs["endpoint_url"] = S3_ENDPOINT_URL

                session = boto3.Session(**session_kwargs)
                self._s3_client = session.client(**client_kwargs)
                logger.info(f"Initialized Cloud S3/R2 storage service targeting bucket: {S3_BUCKET_NAME}")
            except Exception as e:
                logger.error(f"Failed to initialize S3 client: {e}. Falling back to local storage.")
                self.backend = "local"

    def _get_local_path(self, storage_key_or_path: str) -> Path:
        p = Path(storage_key_or_path)
        if p.is_absolute():
            return p
        return STORAGE_DIR / p.name

    def save_file(self, filename: str, data: bytes) -> str:
        """
        Saves encrypted ciphertext either to Cloud Storage (S3 / R2) or local filesystem.
        Returns the storage identifier (filename/key) to store in the database.
        """
        storage_key = Path(filename).name

        if self.backend in ("s3", "r2") and self._s3_client and S3_BUCKET_NAME:
            try:
                self._s3_client.put_object(
                    Bucket=S3_BUCKET_NAME,
                    Key=storage_key,
                    Body=data,
                    ContentType="application/octet-stream"
                )
                return storage_key
            except Exception as e:
                logger.error(f"Failed to upload to S3/R2 bucket '{S3_BUCKET_NAME}': {e}. Falling back to local disk.")
                # Fallback to local on upload failure
                local_path = STORAGE_DIR / storage_key
                with open(local_path, "wb") as f:
                    f.write(data)
                return str(local_path)
        else:
            local_path = STORAGE_DIR / storage_key
            with open(local_path, "wb") as f:
                f.write(data)
            return str(local_path)

    def get_file(self, storage_key_or_path: str) -> bytes:
        """
        Retrieves raw encrypted ciphertext from Cloud Storage (S3 / R2) or local filesystem.
        """
        # 1. Try S3/R2 if enabled
        if self.backend in ("s3", "r2") and self._s3_client and S3_BUCKET_NAME:
            storage_key = Path(storage_key_or_path).name
            try:
                response = self._s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=storage_key)
                return response["Body"].read()
            except Exception as e:
                logger.warning(f"Failed to fetch {storage_key} from S3/R2: {e}. Checking local disk fallback...")

        # 2. Local disk fallback / primary
        local_path = self._get_local_path(storage_key_or_path)
        if local_path.exists():
            with open(local_path, "rb") as f:
                return f.read()

        raise FileNotFoundError(f"Storage item '{storage_key_or_path}' could not be found in cloud or local storage.")

    def delete_file(self, storage_key_or_path: str) -> bool:
        """
        Deletes the file from Cloud Storage and local disk if present.
        """
        deleted = False

        if self.backend in ("s3", "r2") and self._s3_client and S3_BUCKET_NAME:
            storage_key = Path(storage_key_or_path).name
            try:
                self._s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=storage_key)
                deleted = True
            except Exception as e:
                logger.error(f"Error deleting object {storage_key} from S3/R2: {e}")

        local_path = self._get_local_path(storage_key_or_path)
        if local_path.exists():
            try:
                local_path.unlink()
                deleted = True
            except OSError as e:
                logger.warning(f"Could not remove local file {local_path}: {e}")

        return deleted

    def file_exists(self, storage_key_or_path: str) -> bool:
        """
        Checks whether the file exists in cloud storage or on disk.
        """
        if self.backend in ("s3", "r2") and self._s3_client and S3_BUCKET_NAME:
            storage_key = Path(storage_key_or_path).name
            try:
                from botocore.exceptions import ClientError
                self._s3_client.head_object(Bucket=S3_BUCKET_NAME, Key=storage_key)
                return True
            except Exception:
                pass

        local_path = self._get_local_path(storage_key_or_path)
        return local_path.exists()


storage_service = StorageService()
