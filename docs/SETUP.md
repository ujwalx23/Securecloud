# SecureCloud Development & Installation Guide

Follow this guide to run **SecureCloud** locally for development or production deployment.

---

## Environment Prerequisites

- **Python**: 3.10+ (Tested on Python 3.13)
- **Node.js**: v18.0+ & npm 9+
- **Git**

---

## 1. Backend Service Setup

```powershell
# 1. Change directory to backend
cd backend

# 2. Activate virtual environment
.\venv\Scripts\Activate.ps1

# 3. Install requirements
pip install -r requirements.txt

# 4. Launch FastAPI Server with Uvicorn
python -m uvicorn backend.main:app --reload --port 8000
```

The REST API will start at `http://localhost:8000`. API documentation (Swagger UI) is available at `http://localhost:8000/docs`.

---

## 2. Frontend Web Application Setup

```powershell
# 1. Change directory to frontend
cd frontend

# 2. Install Node dependencies
npm install

# 3. Launch Vite development web server
npm run dev
```

The web application will open at `http://localhost:3000`.

---

## 3. Running Automated Tests

To execute the backend automated test suite:
```powershell
c:\Users\singh\Downloads\cloudstorage\backend\venv\Scripts\python.exe -m pytest backend/tests
```

To build the production frontend bundle:
```powershell
cd frontend
npm run build
```
