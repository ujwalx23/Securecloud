# SecureCloud — Zero-Knowledge Encrypted Secure Cloud Storage

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Backend: FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Encryption: AES--256--GCM](https://img.shields.io/badge/Security-AES--256--GCM-cyan.svg)](#security--cryptography)
[![Frontend: React + Vite](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB.svg)](https://vitejs.dev/)

**SecureCloud** is a modern, enterprise-grade Zero-Knowledge Encrypted Cloud Storage platform designed for secure file hosting, file previewing, version management, and secret vault storage.

---

## Features

- **Zero-Knowledge Encryption at Rest**: Files uploaded to storage are encrypted using hardware-accelerated **AES-256-GCM** with unique derived keys (PBKDF2HMAC).
- **Integrity Verification**: Automatic **SHA-256** checksum verification on upload and download stream payloads.
- **File & Folder Management**: Drag-and-drop file upload, folder creation, color-coding, favorites, and trash management.
- **Built-in Media Viewers & Editors**: Decrypted inline previewing for images, code/text editor, audio playback, and video streaming.
- **File Version History**: Keeps track of file revisions with version rollback options.
- **Expirable & Password-Protected Sharing**: Generate secure share links with optional access passwords and expiration timers.
- **Zero-Knowledge Secret Vault**: Encrypted vault for storing sensitive keys, API credentials, and confidential notes.
- **Real-Time Audit Trail**: Complete security log telemetry tracking login events, downloads, file uploads, and vault changes.
- **Capacity & Storage Analytics**: Dynamic storage quota visualization and categorical breakdown (Documents, Media, Code, Archives).

---

## Technical Stack

- **Backend**: Python 3.13, FastAPI, Async SQLAlchemy, SQLite (`aiosqlite`), PyJWT, Cryptography (AES-256-GCM, PBKDF2HMAC).
- **Frontend**: React 18, Vite, Lucide React icons, Vanilla CSS with custom cybersecurity tokens & glassmorphic aesthetics.

---

## Quickstart Guide

### 1. Backend Setup & Startup
```powershell
# Navigate to backend directory
cd backend

# Install dependencies inside virtualenv
.\venv\Scripts\pip.exe install -r requirements.txt

# Run FastAPI server on http://localhost:8000
.\venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend Setup & Startup
```powershell
# Navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Start Vite development server on http://localhost:3000
npm run dev
```

### 3. Default Demo Credentials
- **Email**: `admin@securecloud.io`
- **Password**: `Password123!`

---

## Running Tests

Run the backend Pytest test suite:
```powershell
c:\Users\singh\Downloads\cloudstorage\backend\venv\Scripts\python.exe -m pytest backend/tests
```

---

## Documentation
- Detailed Technical Architecture & E2EE Cryptography Flow: [`docs/ARCHITECTURE.md`](file:///c:/Users/singh/Downloads/cloudstorage/docs/ARCHITECTURE.md)
- Development Setup Guide: [`docs/SETUP.md`](file:///c:/Users/singh/Downloads/cloudstorage/docs/SETUP.md)
