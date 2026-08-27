import os
import hashlib
from typing import Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from backend.config import MASTER_KEY_SALT

# ---------------------------------------------------------
# 1. Symmetric Cryptography Engine (AES-256-GCM)
# ---------------------------------------------------------

def generate_dek() -> bytes:
    """Generate a random 256-bit Data Encryption Key (DEK)."""
    return AESGCM.generate_key(bit_length=256)

def encrypt_data_aes(data: bytes, dek: bytes) -> bytes:
    """
    Encrypt file data payload using AES-256-GCM.
    Returns nonce (12 bytes) + ciphertext.
    """
    aesgcm = AESGCM(dek)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, data, None)
    return nonce + ciphertext

def decrypt_data_aes(encrypted_payload: bytes, dek: bytes) -> bytes:
    """Decrypt payload using AES-256-GCM and DEK."""
    if len(encrypted_payload) < 12:
        raise ValueError("Invalid payload format")
    nonce = encrypted_payload[:12]
    ciphertext = encrypted_payload[12:]
    aesgcm = AESGCM(dek)
    return aesgcm.decrypt(nonce, ciphertext, None)

# Backward-compatibility / Alias helper functions
def derive_key(secret: str, salt: bytes = MASTER_KEY_SALT) -> bytes:
    return derive_key_from_password(secret, salt)

def encrypt_data(data: bytes, key: bytes = None) -> Tuple[bytes, bytes]:
    if key is None:
        key = generate_dek()
    return encrypt_data_aes(data, key), key

def decrypt_data(encrypted_payload: bytes, key: bytes) -> bytes:
    return decrypt_data_aes(encrypted_payload, key)

# ---------------------------------------------------------
# 2. Asymmetric Cryptography Engine (RSA-2048)
# ---------------------------------------------------------

def generate_rsa_keypair() -> Tuple[str, str]:
    """
    Generate RSA-2048 bit asymmetric keypair.
    Returns (public_key_pem_str, private_key_pem_str).
    """
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    public_key = private_key.public_key()

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')

    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')

    return public_pem, private_pem

def rsa_encrypt_dek(dek: bytes, public_key_pem: str) -> str:
    """
    Encrypt a symmetric DEK using recipient's RSA Public Key (RSA-OAEP SHA-256).
    Returns hex-encoded encrypted DEK.
    """
    public_key = serialization.load_pem_public_key(public_key_pem.encode('utf-8'))
    encrypted_dek = public_key.encrypt(
        dek,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return encrypted_dek.hex()

def rsa_decrypt_dek(encrypted_dek_hex: str, private_key_pem: str) -> bytes:
    """
    Decrypt hex-encoded encrypted DEK using RSA Private Key.
    """
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode('utf-8'),
        password=None
    )
    encrypted_dek_bytes = bytes.fromhex(encrypted_dek_hex)
    dek = private_key.decrypt(
        encrypted_dek_bytes,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return dek

# ---------------------------------------------------------
# 3. Key Wrapping / Master Password Derivation
# ---------------------------------------------------------

def derive_key_from_password(password: str, salt: bytes = MASTER_KEY_SALT) -> bytes:
    """Derive 256-bit key from user password or identifier using PBKDF2HMAC SHA-256."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    return kdf.derive(password.encode('utf-8'))

def get_user_master_key(user_id: str) -> bytes:
    """Derive a deterministic 256-bit key for wrapping the user's private key at rest."""
    return derive_key_from_password(f"user-key-salt:{user_id}", salt=MASTER_KEY_SALT)

def encrypt_user_private_key(private_key_pem: str, user_id: str) -> str:
    """Encrypt user's RSA private key at rest using deterministic master key derived from user ID."""
    key = get_user_master_key(user_id)
    encrypted_bytes = encrypt_data_aes(private_key_pem.encode('utf-8'), key)
    return encrypted_bytes.hex()

def decrypt_user_private_key(encrypted_private_key_hex: str, user_id: str) -> str:
    """Decrypt user's RSA private key with primary master key or legacy password fallback."""
    key = get_user_master_key(user_id)
    try:
        encrypted_bytes = bytes.fromhex(encrypted_private_key_hex)
        decrypted_bytes = decrypt_data_aes(encrypted_bytes, key)
        return decrypted_bytes.decode('utf-8')
    except Exception:
        # Fallback for initial demo user or legacy accounts encrypted with default password
        legacy_key = derive_key_from_password("Password123!", salt=MASTER_KEY_SALT)
        encrypted_bytes = bytes.fromhex(encrypted_private_key_hex)
        decrypted_bytes = decrypt_data_aes(encrypted_bytes, legacy_key)
        return decrypted_bytes.decode('utf-8')

def encrypt_private_key(private_key_pem: str, password: str) -> str:
    """Encrypt user's RSA private key using AES-256 with key derived from user password."""
    key = derive_key_from_password(password)
    encrypted_bytes = encrypt_data_aes(private_key_pem.encode('utf-8'), key)
    return encrypted_bytes.hex()

def decrypt_private_key(encrypted_private_key_hex: str, password: str) -> str:
    """Decrypt user's RSA private key using password derived key."""
    key = derive_key_from_password(password)
    encrypted_bytes = bytes.fromhex(encrypted_private_key_hex)
    decrypted_bytes = decrypt_data_aes(encrypted_bytes, key)
    return decrypted_bytes.decode('utf-8')

def calculate_sha256(data: bytes) -> str:
    """Calculate SHA-256 checksum string."""
    return hashlib.sha256(data).hexdigest()

