# SecureCloud Technical Architecture & Security Specification

This document details the system architecture, database models, REST API specifications, and zero-knowledge encryption flow for **SecureCloud**.

---

## 1. Cryptography & Security Model

```
       +-----------------------------------------------------------+
       |                  User Master Credentials                  |
       +-----------------------------------------------------------+
                                     |
                          [PBKDF2HMAC SHA-256]
                                     v
                       +---------------------------+
                       |   Derived 256-bit Key     |
                       +---------------------------+
                                     |
               +---------------------+---------------------+
               |                                           |
    [AES-256-GCM Encrypt]                       [AES-256-GCM Decrypt]
               |                                           |
               v                                           v
       On-Disk Storage                             Decrypted Stream
   (`backend/storage/*.enc`)                    (Inline Preview / Download)
```

### Encryption Engine Specs
- **Algorithm**: AES-256 in Galois/Counter Mode (GCM) for authenticated encryption.
- **Key Derivation Function**: PBKDF2HMAC using SHA-256 with 100,000 iterations and per-user salt.
- **Nonce/IV Generation**: Cryptographically secure 12-byte random IV (`os.urandom(12)`) prepended to stored payload binary.
- **Checksum Verification**: SHA-256 checksum calculated on unencrypted payload and verified upon retrieval.

---

## 2. Database Model Entity Relationship

1. **`User`**: Core user account entity containing storage quota & usage stats.
2. **`Folder`**: Tree hierarchy node (supports self-referencing `parent_id`).
3. **`FileItem`**: Stores original metadata, encrypted file filename on disk, checksum, version number, and trash/favorite flags.
4. **`FileVersion`**: Historical snapshot of file payloads allowing multi-version rollback.
5. **`ShareLink`**: Shareable token link with password hash and expiration timestamp.
6. **`VaultSecret`**: Encrypted text/key/note storage payload.
7. **`ActivityLog`**: Immutable event audit log.

---

## 3. REST API Specification

| Endpoint | Method | Description | Auth Required |
|---|---|---|---|
| `/api/auth/register` | POST | Register new user account | No |
| `/api/auth/login` | POST | Authenticate user & return JWT token | No |
| `/api/auth/me` | GET | Retrieve user profile & quota stats | Yes |
| `/api/files` | GET | List user files with filter parameters | Yes |
| `/api/files/upload` | POST | Multipart upload & AES-256 encryption | Yes |
| `/api/files/{id}/download` | GET | Decrypt & stream file download | Yes |
| `/api/files/{id}/preview` | GET | Inline media stream preview | Yes |
| `/api/files/{id}/trash` | PATCH | Toggle trash status | Yes |
| `/api/files/{id}/versions` | GET | Retrieve file revision history | Yes |
| `/api/folders` | GET/POST | Manage folder hierarchy | Yes |
| `/api/shares/create` | POST | Generate secure expirable link | Yes |
| `/api/shares/{code}` | GET | Public shared file access info | No |
| `/api/vault` | GET/POST | Zero-Knowledge Vault secrets CRUD | Yes |
| `/api/stats/summary` | GET | Storage usage & category breakdown | Yes |
| `/api/stats/activity` | GET | Audit log list | Yes |
