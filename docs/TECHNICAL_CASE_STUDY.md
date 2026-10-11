# SECURECLOUD TECHNICAL ARCHITECTURE & DEEP DIVE REPORT
**System Classification**: Zero-Knowledge Cloud Storage & Cryptographic Communications Framework  
**Project Version**: `2.0.0` | **Environment**: Hybrid Multi-Cloud (Vercel + Render + Neon PostgreSQL + Backblaze B2)  
**Lead Architect & Author**: Ujwal Singh (`ujwalsingh164@gmail.com`)  
**Repository**: [github.com/ujwalx23/Securecloud](https://github.com/ujwalx23/Securecloud)  

---

## 1. PROJECT OVERVIEW

### 1.1 Name & Core Purpose
**SecureCloud** (internally `securecloud-frontend` / `SecureCloud Enterprise API`) is a high-security, zero-knowledge cloud file storage, encrypted text repository, private messaging, and credential vault system. The platform guarantees that all user files, notes, credentials, and communications are safeguarded using hybrid asymmetric/symmetric cryptography, ensuring that unauthorized third parties and cloud storage providers cannot access raw plaintext data at rest.

### 1.2 Problem Solved
Traditional cloud storage platforms (Google Drive, Dropbox, OneDrive) store user files unencrypted or hold the decryption keys on server clusters they control, creating serious vulnerabilities:
1. **Third-Party Data Exposure**: Cloud hosting providers can inspect, index, train models on, or leak unencrypted files.
2. **Key Compromise & Lack of Forward Secrecy**: Storing a static encryption key for an entire user database exposes all files if a single key is leaked.
3. **Complex PKI Management for Everyday Users**: Asymmetric cryptography (PGP/GPG) has historically suffered from high user friction, key-exchange barriers, and confusing manual processes.
4. **Vulnerable File Sharing**: Traditional public links often remain exposed indefinitely without cryptographic expiries, password verification, or instant revocability.
5. **Insecure Password & OTP Registration Loops**: Registering users before verifying their email creates database clutter, orphan accounts, and vulnerability to spam/DDoS.

SecureCloud eliminates these vulnerabilities through:
- **Per-file Data Encryption Keys (DEKs)** generated via cryptographically secure pseudo-random generators (`AES-256-GCM`).
- **Individual RSA-2048 Asymmetric Keypairs** generated for each user; private keys are stored wrapped and unsealed only during authenticated operations.
- **Zero-Storage-Duplication Re-Encryption**: Files shared between users re-encrypt only the lightweight 256-bit DEK using the recipient's RSA public key without duplicating the large underlying ciphertext on disk or in object storage.
- **Strict One-Step OTP Registration**: Users are never registered or inserted into the user directory until their 6-digit email OTP is submitted and confirmed.
- **Automated Storage Quota Engine**: Exactly 10 Dedicated Premium Slots (1,000 MB each) with a FIFO waiting queue and automatic instant promotion upon slot vacation.

### 1.3 Target Users
- Cryptographers, security professionals, and software developers who require verifiable cryptographic guarantees.
- Enterprises and privacy-focused teams requiring zero-knowledge document handling, secret key storage, and end-to-end encrypted messaging.
- Everyday users seeking private cloud storage with modern, responsive, dark-mode glassmorphic aesthetics.

### 1.4 Main Features
- **Zero-Knowledge File Manager**: Upload, download, rename, preview, favorite, and trash files with real-time MIME-type classification and byte tracking.
- **Hybrid Cryptographic Sharing**: Share files directly with registered users via RSA-2048 DEK re-wrapping, or create expirable, password-protected public share links with download limits.
- **Dedicated Storage Slots & Waiting Queue**: 10 dedicated premium slots (1,000 MB per slot), transparent queue positioning, and automated promotion when accounts are deleted or demoted.
- **End-to-End Encrypted Private Chat**: Real-time 1-on-1 private messaging via WebSocket channels with delivery receipts, message editing, soft-deletion, and encrypted file attachments.
- **Zero-Knowledge Vault Secrets**: Client-side/server-side isolated credentials vault storing passwords, API tokens, SSH keys, and encrypted notes.
- **Personal Text Notes & Documents**: Real-time autosaving markdown documents and code memos with personal text byte allocations (1 MB default).
- **Executive Administrator Command Center**: Telemetry overview, user lifecycle management (activate, suspend, delete, edit quota, force-verify, reset password, toggle admin), live OTP/audit logs, and contact inquiries ticket tracker.
- **Resilient Multi-Tier Email Delivery**: Google Apps Script Webhook on HTTPS (Port 443), Brevo REST API, Gmail SMTP (SSL 465 / STARTTLS 587), and Resend API.
- **Three.js 3D WebGL Canvases**: Interactive visual security cores (`SecurityCore3D.jsx`, `VaultLock3D.jsx`, `CyberCanvas3D.jsx`).

---

## 2. FULL TECH STACK

All library versions and packages below are extracted directly from `requirements.txt` and `frontend/package.json`.

### 2.1 Backend Dependencies (`requirements.txt`)
| Library | Version | Why It Is Used | File(s) Where Used |
| :--- | :--- | :--- | :--- |
| **`fastapi`** | `>=0.110.0` | High-performance async ASGI web framework providing OpenAPI schemas, dependency injection, and WebSocket routing. | `backend/main.py`, `backend/routes/*.py` |
| **`uvicorn`** | `>=0.28.0` | Lightning-fast ASGI server implementation used to run the FastAPI application with multi-worker concurrency. | `backend/Dockerfile`, `render.yaml` |
| **`sqlalchemy[asyncio]`**| `>=2.0.0` | Enterprise-grade Object Relational Mapper (ORM) utilizing modern `Mapped[]` type annotations and async execution. | `backend/database.py`, `backend/models.py` |
| **`greenlet`** | `>=3.0.0` | Low-level C extension required by SQLAlchemy to run async ORM sessions over asyncio coroutines. | `backend/database.py` |
| **`asyncpg`** | `>=0.29.0` | High-throughput async driver for PostgreSQL used to communicate over SSL with the Neon PostgreSQL database. | `backend/database.py`, `.env` |
| **`aiosqlite`** | `>=0.20.0` | Async SQLite driver used for local development, fallback persistence, and in-memory automated testing. | `backend/config.py`, `backend/tests/run_tests.py` |
| **`cryptography`** | `>=42.0.0` | Industrial-grade cryptographic primitives providing `AESGCM`, `PBKDF2HMAC`, `hashes.SHA256`, `rsa.generate_private_key`, `padding.OAEP`, and PEM serialization. | `backend/crypto_utils.py` |
| **`python-jose[cryptography]`**| `>=3.3.0` | Implements JSON Web Token (JWT) generation, validation, cryptographic signing, and decoding via the HS256 algorithm. | `backend/auth.py`, `backend/routes/chat_routes.py` |
| **`passlib[bcrypt]`** | `>=1.7.4` | Password hashing library used for password hashing compatibility and verification routines. | `backend/auth.py` |
| **`pydantic[email]`** | `>=2.6.0` | Runtime data parsing, type validation, schema enforcement, and JSON serialization. | `backend/schemas.py` |
| **`email-validator`** | `>=2.0.0` | Validates email syntax, domain deliverability, and RFC compliance during registration and sharing. | `backend/schemas.py` |
| **`python-multipart`** | `>=0.0.9` | Handles streaming multi-part form data uploads for encrypted binary files and metadata payloads. | `backend/routes/file_routes.py` |
| **`boto3`** | `>=1.34.0` | AWS SDK for Python used to communicate with Cloudflare R2 / Backblaze B2 S3-compatible cloud object storage. | `backend/storage_service.py` |
| **`python-dotenv`** | `>=1.0.0` | Loads environment configurations from `.env` files into `os.environ` on runtime startup. | `backend/config.py` |
| **`httpx`** | `>=0.27.0` | Asynchronous HTTP client used to execute webhook dispatches to Google Apps Script and Brevo REST APIs. | `backend/email_service.py` |
| **`requests`** | `>=2.31.0` | Synchronous HTTP client utility used for diagnostic calls and fallback network tests. | `backend/email_service.py` |
| **`pytest`** | `>=8.0.0` | Automated testing framework used to drive platform unit and integration test suites. | `backend/tests/test_platform.py` |

### 2.2 Frontend Dependencies (`frontend/package.json`)
| Package | Version | Why It Is Used | File(s) Where Used |
| :--- | :--- | :--- | :--- |
| **`react`** | `^18.2.0` | Modern declarative component architecture utilizing concurrent rendering, hooks, and context APIs. | All files in `frontend/src/` |
| **`react-dom`** | `^18.2.0` | Virtual DOM binding and root rendering engine for browser environments. | `frontend/src/main.jsx` |
| **`react-router-dom`**| `^7.18.4` | Client-side routing engine managing independent sub-websites, route protection, lazy loading, and history. | `frontend/src/App.jsx` |
| **`three`** | `^0.162.0` | WebGL 3D rendering library used to construct interactive 3D cryptographic security cores and vault locks. | `SecurityCore3D.jsx`, `VaultLock3D.jsx`, `CyberCanvas3D.jsx` |
| **`lucide-react`** | `^0.344.0` | Comprehensive vector icon toolkit used throughout navigation, telemetry badges, cards, and modal dialogs. | All component files |
| **`tailwindcss`** | `^4.3.3` | Next-generation utility-first styling engine delivering responsive layouts and glassmorphic styling tokens. | `frontend/src/index.css` |
| **`vite`** | `^5.1.6` | Next-generation frontend build tool providing fast HMR and optimized production Rollup chunks. | `frontend/vite.config.js` |

### 2.3 Cloud Services & Infrastructure
1. **Frontend Hosting — Vercel**: Hosted at `https://securecloud.vercel.app`. Defined in `frontend/vercel.json` with seamless rewrites routing `/api/(.*)` to the Render backend and `/(.*)` to `/index.html`.
2. **Backend Hosting — Render**: Hosted at `https://securecloud-i0qq.onrender.com`. Packaged as a lightweight Linux container via `backend/Dockerfile` with Python 3.11-slim and Uvicorn.
3. **Database — Neon PostgreSQL**: Serverless PostgreSQL instance hosted in AWS `us-east-2` with connection pooling over TLS (`ssl=require`). Configured via `DATABASE_URL` in `.env`.
4. **Cloud Object Storage — Backblaze B2**: S3-compatible cloud storage bucket (`securecloud-vault` at `s3.us-east-005.backblazeb2.com`) using AWS S3v4 signature protocols via Boto3.
5. **Primary Email Dispatch — Google Apps Script Webhook**: Runs on the administrator's Google account (`ujwalsingh164@gmail.com`) via `MailApp.sendEmail()` over HTTPS Port 443, bypassing Render's outbound SMTP port blocks.
6. **Fallback Email Gateways**: Brevo REST API (HTTPS 443), Gmail SMTP (`smtp.gmail.com:465` SSL / `587` TLS), and Resend API (`api.resend.com/emails`).
7. **Identity Services — Google OAuth 2.0**: Client ID `593769489522-jkbfd18upg9e4cha237sueeasf94j02k.apps.googleusercontent.com` for one-click authentication.
8. **Google SMS**: **NOT FOUND**. The codebase strictly uses email-based OTP dispatch. No SMS gateway (such as Twilio or Google Cloud SMS API) exists in the repository.

---

## 3. FOLDER STRUCTURE

```
cloudstorage/
├── .env                              # Local/Production environment variables (Neon Postgres, Backblaze B2, Webhooks)
├── .env.example                      # Production template of required environment variable keys (sanitized)
├── .gitignore                        # Git exclusion rules (node_modules, venv, databases, storage caches)
├── docker-compose.yml                # Multi-container orchestration (FastAPI backend + Vite/Nginx frontend)
├── README.md                         # Project documentation and architectural overview
├── requirements.txt                  # Python production backend dependencies
├── start_local.bat                   # Automated Windows launcher script for simultaneous local dev execution
│
├── backend/                          # FastAPI Core Backend Engine
│   ├── auth.py                       # Authentication, JWT management, PBKDF2 hashing, session verification
│   ├── config.py                     # Central configuration parser, paths, storage parameters, and salts
│   ├── crypto_utils.py               # Cryptographic engine: AES-256-GCM, RSA-2048, OAEP, DEK wrapping, SHA-256
│   ├── database.py                   # Async SQLAlchemy engine, Neon connection pooler, and sessionmaker
│   ├── Dockerfile                    # Containerization specification for Python 3.11 Linux deployment
│   ├── email_service.py              # Multi-tier email dispatch (Google Webhook, Brevo, SMTP, Resend)
│   ├── main.py                       # FastAPI application entry point, security headers, CORS, router mounts
│   ├── migrate_db.py                 # Idempotent database schema migration and slot seeding script
│   ├── models.py                     # 20 SQLAlchemy declarative ORM database models
│   ├── rate_limiter.py               # Memory-resident brute-force login rate limiter & IP lockout engine
│   ├── schemas.py                    # Pydantic schemas, validation models, and API response contracts
│   ├── storage_allocation.py         # Dedicated 10-slot quota manager, waiting queue, and auto-promotion engine
│   ├── storage_service.py            # Unified S3/B2 & local filesystem object storage abstraction layer
│   │
│   ├── routes/                       # Modular REST API Routers
│   │   ├── admin_routes.py           # Administrative command center, user control, telemetry, inquiries
│   │   ├── auth_routes.py            # User registration, email OTP verification, login, OAuth, sessions
│   │   ├── chat_routes.py            # Private 1-on-1 chat, WebSocket room broadcast, message persistence
│   │   ├── documents_routes.py       # Personal markdown notes and documents CRUD with byte quota tracking
│   │   ├── file_routes.py            # Hybrid AES-256 encrypted file uploads, downloads, preview, trash
│   │   ├── folder_routes.py          # Hierarchical folder structure, renaming, favorites, recursive trash
│   │   ├── notification_routes.py    # In-app notifications, unread counts, and mark-as-read actions
│   │   ├── share_routes.py           # RSA DEK re-wrapping user-to-user sharing & expirable public links
│   │   ├── stats_routes.py           # User dashboard storage metrics, file count, and activity log feeds
│   │   ├── subscription_routes.py    # Pricing plans, 30-day trial evaluation, Stripe checkout endpoints
│   │   ├── user_routes.py            # User directory search, communication requests, peer blocking
│   │   └── vault_routes.py           # Isolated zero-knowledge credential vault and secret tokens CRUD
│   │
│   ├── storage/                      # Local persistent encrypted file directory (used when S3 is unavailable)
│   └── tests/                        # Comprehensive Automated Test Suites
│       ├── run_tests.py              # Unified 8-suite automated test runner and assertion reporter
│       └── test_platform.py          # Pytest async test cases for auth, crypto, slots, and admin tools
│
└── frontend/                         # React 18 Single-Page & Multi-Sub-website Application
    ├── index.html                    # HTML5 shell with Google Fonts preloads and responsive meta viewport
    ├── nginx.conf                    # Nginx reverse proxy configuration for Docker frontend serving
    ├── package.json                  # Frontend dependencies, scripts, and package metadata
    ├── postcss.config.js             # PostCSS processing pipeline for TailwindCSS
    ├── tailwind.config.js            # Tailwind theme tokens, vibrant gradients, and animations
    ├── vercel.json                   # Vercel deployment specification with API reverse-proxy rewrites
    ├── vite.config.js                # Vite build configuration, dev server proxy, and code-splitting rules
    │
    └── src/
        ├── App.jsx                   # Master routing router, lazy page code-splitting, layout structure
        ├── index.css                 # Complete design system: HSL color tokens, dark glassmorphism, utilities
        ├── main.jsx                  # React DOM root initialization with error boundary
        │
        ├── context/                  # React Context State Providers
        │   ├── AuthContext.jsx       # Global user profile, JWT token management, login/logout methods
        │   ├── ThemeContext.jsx      # System dark/light theme switching with DOM class sync
        │   ├── ToastContext.jsx      # Non-intrusive floating toast notifications system
        │   └── WorkspaceContext.jsx  # Active folder navigation, search query, modal visibility state
        │
        ├── pages/                    # 22 Code-Split Sub-websites / Pages
        │   ├── ActivityPage.jsx      # Cryptographic audit logs and chronological user security history
        │   ├── AdminPage.jsx         # Executive Administrator Command Center view wrapper
        │   ├── AnalyticsPage.jsx     # Storage quota analytics, MIME distributions, and storage trends
        │   ├── AuthPage.jsx          # Dual-mode Sign In / Sign Up and OTP verification sub-website
        │   ├── ChatPage.jsx          # Private 1-on-1 end-to-end encrypted messaging page
        │   ├── ContactPage.jsx       # Public & authenticated enterprise support inquiries form
        │   ├── ContactsPage.jsx      # Peer directory, connection requests, and blocklist manager
        │   ├── DocumentsPage.jsx     # Encrypted personal notes, markdown editor, and code memos
        │   ├── FavoritesPage.jsx     # Filtered collection of starred files and pinned folders
        │   ├── FilesPage.jsx         # Primary cloud file manager with hierarchical folder navigation
        │   ├── IntegrityPage.jsx     # Merkle/SHA-256 cryptographic verification and data integrity audits
        │   ├── LegalPage.jsx         # Terms of Service, Privacy Policy, Security Model, and Compliance
        │   ├── NotFoundPage.jsx      # Cyberpunk-themed 404 error page with quick return navigation
        │   ├── OverviewPage.jsx      # Unified workspace dashboard, telemetry cards, and quick uploads
        │   ├── PublicSharePage.jsx   # Standalone anonymous share link viewer with password unlock
        │   ├── RecentFilesPage.jsx   # Chronological log of recently uploaded and modified files
        │   ├── SettingsPage.jsx      # Account profile, RSA key fingerprints, password reset, sessions
        │   ├── SharedLinksPage.jsx   # Creator dashboard for inspecting and revoking active public links
        │   ├── SharedWithMePage.jsx  # Repository of files shared directly with the user via RSA DEKs
        │   ├── SubscriptionsPage.jsx # Pricing plans, active quota slot display, and plan upgrades
        │   ├── TrashPage.jsx         # Encrypted trash bin with file recovery and permanent purge
        │   └── VaultPage.jsx         # Zero-knowledge credential and secret tokens isolation repository
        │
        └── components/               # Reusable Modular UI Components
            ├── ActivityLog.jsx       # Formatted event timeline component
            ├── AdminView.jsx         # Multi-tab administrative telemetry and user directory interface
            ├── ChatView.jsx          # Real-time WebSocket messaging interface with auto-scroll
            ├── CommandPalette.jsx    # Mac/Windows Quick Command Bar (⌘K / Ctrl+K)
            ├── ContactsView.jsx      # Peer search and connection request management cards
            ├── ContactView.jsx       # Enterprise inquiry form with category and priority selectors
            ├── CyberCanvas3D.jsx     # Animated WebGL three.js particle grid background
            ├── DeviceOnboardingModal.jsx # New device cryptographic pairing prompt
            ├── DocumentsView.jsx     # Split-pane markdown editor with live preview and autosave
            ├── FileCard.jsx          # Grid item card with MIME-type badge, size, and context menus
            ├── FileDetailsDrawer.jsx # Slide-out sidebar displaying file checksum, DEK state, and stats
            ├── FileManager.jsx       # Complete file table and grid with drag-and-drop upload zone
            ├── FileUploadModal.jsx   # Multi-file upload dialog with encryption progress indicators
            ├── IntegrityCenter.jsx   # Byte-for-byte SHA-256 verification and tampering audit dashboard
            ├── LegalView.jsx         # Formatted legal policy renderer with tab switching
            ├── Navbar.jsx            # Top navigation bar with live search, upload button, and profile menu
            ├── OverviewDashboard.jsx # Quick stats summary, storage gauges, and recent files preview
            ├── PreviewModal.jsx      # In-browser decryptor and previewer for images, PDFs, code, text
            ├── PublicShareView.jsx   # Public file download card with password verification field
            ├── SecurityCore3D.jsx    # Interactive 3D floating cryptographic tetrahedron visualization
            ├── SettingsView.jsx      # User profile editor, session revocation table, security settings
            ├── ShareModal.jsx        # Dual-tab dialog for peer sharing (RSA) and public links
            ├── Sidebar.jsx           # Collapsible workspace navigation sidebar with storage gauge
            ├── StorageStats.jsx      # Visual storage quota bars and breakdown cards
            ├── SubscriptionsView.jsx # Tier comparison cards and feature matrices
            ├── VaultLock3D.jsx       # Interactive 3D vault lock mechanism visualization
            ├── VaultView.jsx         # Secret tokens and credential vault manager with reveal toggle
            └── common/
                ├── PageHeader.jsx    # Standardized header with breadcrumbs, icon, and action buttons
                └── PageSkeleton.jsx  # Animated glassmorphism loading skeleton for lazy-loaded routes
```

---

## 4. ARCHITECTURE & REQUEST FLOWS

### 4.1 System Topology
- **Frontend Layer**: Vercel Edge CDN serving pre-rendered, code-split React chunks.
- **API Routing**: Vercel rewrites `/api/*` to the Render backend service. Direct WebSocket connections (`/api/chat/ws/*`) connect over WSS.
- **Backend Service**: Containerized FastAPI on Render executing async coroutines.
- **Data Persistence**: Managed Neon PostgreSQL over TLS (`asyncpg`).
- **Object Storage**: S3-compatible Backblaze B2 bucket (`securecloud-vault`) with local disk fallback.
- **Email Delivery**: High-priority Google Apps Script Webhook on HTTPS (Port 443) running `MailApp.sendEmail()` with fallbacks to Brevo, Gmail SMTP, and Resend.

---

## 5. DATABASE ARCHITECTURE (20 SQLALCHEMY MODELS)

All 20 models are defined in `backend/models.py`:
1. `User` &mdash; Core user identity, RSA-2048 keys, quotas, online presence, OTP code.
2. `StorageAllocationSlot` &mdash; 10 dedicated premium slots (1 to 10) mapping to users.
3. `UserSession` &mdash; Active login tokens (SHA-256 hashed), IP addresses, user agents, revocation status.
4. `FileItem` &mdash; File metadata, AES-256-GCM encrypted storage key, RSA-encrypted DEK, SHA-256 checksum.
5. `FileVersion` &mdash; Historical snapshots of files for point-in-time recovery.
6. `Folder` &mdash; Hierarchical directories with parent/child relationship and color badges.
7. `ShareLink` &mdash; Public expirable share links with password protection and download caps.
8. `UserShare` &mdash; Direct user-to-user sharing via recipient RSA DEK re-wrapping.
9. `VaultSecret` &mdash; Passwords, API tokens, SSH keys, and encrypted credentials.
10. `TextDocument` &mdash; Personal markdown notes and code memos with 1 MB text quota tracking.
11. `Conversation` &mdash; Private chat thread container.
12. `ConversationParticipant` &mdash; Chat participant link with `last_read_at` tracking.
13. `ChatMessage` &mdash; Private chat messages with editing, soft-deletion, and file attachments.
14. `CommunicationRequest` &mdash; Social connection requests (`pending`, `accepted`, `rejected`, `blocked`).
15. `UserConnection` &mdash; Confirmed connection relationship between two users.
16. `Notification` &mdash; User notifications with type, title, body, and read receipts.
17. `SecurityAuditLog` &mdash; Immutable administrative security audit trail.
18. `ActivityLog` &mdash; User-specific action timeline logs.
19. `SubscriptionRecord` &mdash; Subscription and payment history records.
20. `ContactInquiry` &mdash; Enterprise customer support ticket inquiries.

---

## 6. METRICS & COUNTS SUMMARY

- **Total Files Scanned**: 182 files
- **Total Lines of Code**: 23,951 lines
  * React JSX: 12,231 lines (57 files)
  * Python: 7,628 lines (32 files)
  * JSON: 2,638 lines (4 files)
  * CSS: 593 lines (1 file)
  * Markdown: 592 lines (4 files)
  * JavaScript: 144 lines (4 files)
  * YAML: 54 lines (2 files)
  * Dockerfile: 44 lines (2 files)
  * HTML: 27 lines (1 file)
- **Total Frontend Pages**: 22 independent sub-websites
- **Total Frontend Components**: 29 reusable components
- **Total Database Models**: 20 SQLAlchemy ORM models
- **Total REST & WebSocket API Endpoints**: 79 endpoints
- **Total Automated Test Suites**: 8 test suites (100% pass rate)
- **Git Commits**: 41 commits by Lead Architect Ujwal Singh (`ujwalsingh164@gmail.com`)
