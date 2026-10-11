# SecureCloud — Live Production Deployment Guide

This guide walks you through deploying **SecureCloud** to production with **real cloud object storage** and hosting both the backend and frontend (including on **Vercel**).

---

## ☁️ 1. Real Cloud Storage: Free Tier Comparison

| Cloud Provider | Free Storage | Free Bandwidth / Egress | Free Duration | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Cloudflare R2** | **10 GB / month** | **$0.00 (Unlimited Free Egress)** | **Permanent (Forever)** | 🏆 **Best Choice** |
| **Supabase Storage** | 1 GB | 2 GB / month | Permanent | Good for small projects |
| **AWS S3** | 5 GB | 100 GB egress/mo | 12 Months only (then paid) | Standard industry, but paid egress |
| **Google Cloud Storage** | 5 GB | 1 GB egress/mo | Permanent (US only) | Restricted region |

> **Why Cloudflare R2 is the Best:**
> 1. **10 GB completely free storage every month forever**.
> 2. **Zero egress / download bandwidth fees**: Traditional providers (like AWS) charge you every time users download files. Cloudflare R2 has **$0 egress fees**.
> 3. **100% S3-Compatible**: Uses the exact same S3 SDK (`boto3`), so you can switch providers anytime without modifying code.

---

## 🛠️ 2. Setting Up Cloudflare R2 (3-Minute Setup)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and log in or create a free account.
2. In the left sidebar, click **R2 Object Storage**.
3. Click **Create bucket**:
   - Bucket name: `securecloud-vault` (or any name you choose)
   - Location: `Automatic`
   - Click **Create Bucket**.
4. Create API Credentials:
   - On the R2 Overview page, click **Manage R2 API Tokens** (top-right).
   - Click **Create API Token**.
   - Permissions: Select **Object Read & Write**.
   - TTL: Leave blank or set to your preference.
   - Click **Create API Token**.
5. Save the generated credentials:
   - **Jurisdiction-specific endpoint** (S3 Endpoint URL): e.g. `https://<account_id>.r2.cloudflarestorage.com`
   - **Access Key ID**
   - **Secret Access Key**
   - **Bucket Name**

---

## 🚀 3. Deploying the Backend (FastAPI + Crypto Engine)

Because FastAPI performs cryptographic streaming and needs a persistent process, the best free hosting options are:
- **Render.com** (Free Web Service)
- **Railway.app** ($5 free credit / trial)
- **Koyeb** (Free micro container)

### Deploying to Render.com (Recommended & Free):
1. Push your repository to GitHub.
2. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Settings:
   - **Root Directory**: `backend` (or leave root and use start command)
   - **Environment**: `Python 3` (or `Docker`)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   ```env
   STORAGE_BACKEND=r2
   S3_ENDPOINT_URL=https://<your-account-id>.r2.cloudflarestorage.com
   S3_ACCESS_KEY_ID=<your-r2-access-key-id>
   S3_SECRET_ACCESS_KEY=<your-r2-secret-access-key>
   S3_BUCKET_NAME=securecloud-vault
   S3_REGION_NAME=auto
   JWT_SECRET_KEY=<generate-a-random-secret-key>
   DATABASE_URL=sqlite+aiosqlite:///cloudstorage.db
   ```
6. Click **Deploy Web Service**.
7. Copy your backend URL once live: e.g. `https://securecloud-backend.onrender.com`.

*(Optional: For production persistent database, you can create a free PostgreSQL database on Render or Supabase and paste its connection URL into `DATABASE_URL`)*.

---

## 🌐 4. Deploying the Frontend on Vercel

Since you are already comfortable with **Vercel**, deploying the React frontend takes less than 60 seconds:

### Method A: Via Vercel Web Dashboard (1-Click)
1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repository.
2. In the project setup screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `frontend`
3. Expand **Environment Variables** and add:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://securecloud-backend.onrender.com` *(replace with your live backend URL from Step 3)*
4. Click **Deploy**.

### Method B: Via Vercel CLI (Terminal)
```bash
cd frontend
vercel
```
When prompted for environment variable, set:
`VITE_API_BASE_URL=https://securecloud-backend.onrender.com`

---

## ✅ 5. Verification Checklist

1. Open your Vercel URL (e.g. `https://securecloud-ui.vercel.app`).
2. Register a new user account.
3. Upload a file.
4. Check your Cloudflare R2 bucket dashboard:
   - You will see `{uuid}.enc` stored directly in your cloud bucket, completely encrypted with **AES-256-GCM**!
5. Download the file from your Vercel app:
   - The ciphertext is fetched from Cloudflare R2, decrypted with your RSA-2048 key, and delivered in seconds.
