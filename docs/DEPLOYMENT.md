# ResolvIN — Production Deployment Guide

This guide provides practical instructions for deploying the ResolvIN multi-stakeholder governance and innovation platform to staging and production environments.

---

## 1. System Architecture

```
[ Citizen / Admin Browser ]       [ Mobile App (Expo SDK 57) ]
            │                                  │
            ▼                                  ▼
[ Next.js Web Frontend ] ─────────► [ NestJS Backend API ]
  (Port 3000 / Vercel)              (Port 3001 / Render / Fly)
                                        │          │
                     ┌──────────────────┴──┐       └──► [ FastAPI AI Service ]
                     ▼                     ▼            (Port 8000 / NVIDIA NIM)
           [ PostgreSQL 16 ]     [ Persistent Storage ]
           (Neon / Supabase)     (Mount / S3 / R2)
```

---

## 2. Required Services & Infrastructure

| Service | Runtime / Engine | Recommended Production Host | Free Tier Viable? |
| :--- | :--- | :--- | :--- |
| **Web Frontend** | Next.js 14 (App Router) | **Vercel** / Cloudflare Pages | **Yes** (100% free forever on Hobby) |
| **Backend API** | NestJS 10 (Node.js 20+) | **Render** / Railway / Fly.io | **Yes** (Render Free Web Service) |
| **Database** | PostgreSQL 16 (`uuid-ossp`) | **Neon.tech** / Supabase | **Yes** (Neon 0.5 GB Free Tier) |
| **AI Service** | FastAPI (Python 3.10+) | Render Web Service / Koyeb | **Yes** (Free router; calls NVIDIA NIM) |
| **Media Storage** | Persistent Disk / S3 Object | Cloudflare R2 / Persistent Volume | **Yes** (Cloudflare R2 free 10GB) |

---

## 3. Environment Variables Reference

Never commit `.env` files containing real production secrets. Use the provided `.env.example` templates.

### Backend (`backend/.env` or hosting provider environment)
```bash
# Server & Port
PORT=3001
NODE_ENV=production
APP_NAME=ResolvIN

# Database Connection (Neon / Supabase / Render)
DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require
DATABASE_SSL=true

# CORS Allowed Origins (Comma-separated allowed frontend domains)
CORS_ORIGIN=https://resolvin.vercel.app

# Authentication
JWT_SECRET=replace-with-a-cryptographically-secure-random-32-char-key
JWT_EXPIRES_IN=7d

# Microservices & Proxies
AI_SERVICE_URL=https://resolvin-ai.onrender.com

# Media & Uploads
UPLOADS_DIR=/data/uploads/evidence
MAX_EVIDENCE_FILE_SIZE_BYTES=15728640
```

### Frontend (`frontend/.env.production` or Vercel Environment)
```bash
# Public API URL called by browser client
NEXT_PUBLIC_API_URL=https://resolvin-api.onrender.com/api

# Internal Backend URL called by Next.js server rewrites
BACKEND_URL=https://resolvin-api.onrender.com/api
```

### AI Service (`ai-service/.env` or hosting provider environment)
```bash
# Provider: "nvidia" (cloud NIM API) or "mock" (deterministic zero-cost fallback)
AI_PROVIDER=nvidia
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_API_KEY=nvapi-your-key-here
LLM_MODEL=meta/llama-3.2-11b-vision-instruct
EMBEDDING_MODEL=nvidia/nemotron-3-embed-1b
RERANKER_MODEL=nvidia/rerank-qa-mistral-4b
EMBEDDING_DIMENSIONS=2048
```

---

## 4. Database Setup, Migrations & Seeds

The database schema is 100% managed via TypeORM migrations. No manual table creation with pgAdmin or SQL is needed.

### Step 1: Create Empty PostgreSQL Database
Create a clean database on your provider (e.g. Neon.tech or Supabase).

### Step 2: Set `DATABASE_URL`
Provide the connection string with `sslmode=require`.

### Step 3: Run Migrations (Production Command)
Executes pure compiled JavaScript from `dist/` without requiring `ts-node`:
```bash
cd backend
npm run migration:run:prod
```
*Result: Automatically creates all 60 core tables, foreign keys, indexes, and custom enums.*

### Step 4: Run Initial Production Seeds
Seeds master capabilities, industry sectors, and foundational administrative/demo accounts:
```bash
cd backend
npm run seed:run:prod
```

---

## 5. Build and Start Commands

### Backend API
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run migration:run:prod && npm run seed:run:prod && npm run start:prod`
- **Health Check Path:** `/health` (returns HTTP 200 `{ "status": "ok" }`)

### Web Frontend (Next.js)
- **Install & Build:** `npm install && npm run build`
- **Start Command:** `npm run start` (or managed automatically by Vercel)
- **Port:** Default `3000` (or host injected `PORT`)

### AI Service (FastAPI)
- **Install:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1`
- **Health Check Path:** `/health` (returns HTTP 200 `{ "status": "healthy" }`)

---

## 6. Media & File Upload Storage Requirements

The application supports citizen image, audio, video, and PDF evidence uploads:
- **Maximum File Size:** Configurable via `MAX_EVIDENCE_FILE_SIZE_BYTES` (default: 15 MB).
- **Supported MIME Types:** `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/quicktime`, `video/webm`, `audio/mp4`, `audio/wav`, `audio/mpeg`, `application/pdf`, `text/plain`.
- **Ephemeral Host Notice:** Free hosting containers (Render/Railway) erase local disk storage on restart. For production persistence:
  1. Mount a persistent disk volume to `UPLOADS_DIR` (e.g., Render Disk at `/data/uploads`), OR
  2. Route uploads to an S3-compatible bucket (e.g., Cloudflare R2, AWS S3, Supabase Storage).

---

## 7. CORS & Cross-Domain Security

When frontend and backend reside on separate domains (e.g. `resolvin.vercel.app` and `resolvin-api.onrender.com`):
- Set `CORS_ORIGIN=https://resolvin.vercel.app` in backend environment variables.
- Multiple domains can be provided as a comma-separated list (`https://domain-a.com,https://domain-b.com`).
- The backend dynamically reflects the origin safely when credentials (`Bearer` tokens) are passed.

---

## 8. Free Hosting Architecture Recommendation

The entire platform can be hosted with zero monthly server costs:

| Tier | Component | Free Host | Specifications |
| :--- | :--- | :--- | :--- |
| **Frontend** | Next.js Web App | **Vercel** | Free global CDN, automatic SSL, serverless SSR |
| **Backend** | NestJS API | **Render** | Free Web Service (512MB RAM, Node.js 20) |
| **Database** | PostgreSQL 16 | **Neon.tech** | Free Serverless Postgres (0.5 GB storage, autoscaling) |
| **AI Service** | FastAPI Proxy | **Render** | Free Web Service (calls NVIDIA NIM API) |
| **Storage** | Object Storage | **Cloudflare R2** | 10 GB free storage, $0 egress fees |

---

## 9. Known Free-Tier Limitations & Mitigations

1. **Render Free Web Service Sleep:**
   - Free instances spin down after 15 minutes of inactivity.
   - *Symptom:* The first request after sleep takes 45–50 seconds (cold start).
   - *Mitigation:* A free cron pinger (e.g., UptimeRobot, cron-job.org) pinging `GET /health` every 10 minutes keeps the instance warm.
2. **AI Inference Costs:**
   - The FastAPI AI microservice is 100% free to host.
   - Real LLM inference calls NVIDIA NIM cloud API. Free NVIDIA developer accounts include trial inference credits.
   - *Zero-Cost Fallback:* When credits expire or no key is provided, setting `AI_PROVIDER=mock` provides deterministic, high-accuracy classification and matching with zero external dependencies.
3. **Database Volume Limits:**
   - Neon provides 0.5 GB on free tier. This is sufficient for over 50,000 challenge records and metadata. Media binary files are stored in object storage / disk, not directly in database binary columns.

---

## 10. Production Deployment Checklist

- [ ] Clean PostgreSQL 16 database created on Neon / Supabase.
- [ ] `DATABASE_URL` configured with `sslmode=require`.
- [ ] `JWT_SECRET` generated with 32+ cryptographically random characters.
- [ ] Backend deployed with `npm run migration:run:prod` executing prior to start.
- [ ] Backend verified passing `/health` returning `{ "status": "ok", "readiness": "ready" }`.
- [ ] Frontend configured with `NEXT_PUBLIC_API_URL` pointing to backend API.
- [ ] CORS set on backend matching deployed frontend URL.
- [ ] Uploads directory configured with persistent volume or cloud storage.
- [ ] Admin and demo users verified logging in successfully.
