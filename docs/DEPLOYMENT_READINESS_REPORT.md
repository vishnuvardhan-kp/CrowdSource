# Deployment Readiness

## Current Architecture

Frontend: Next.js 14.2 (React 18, App Router, TypeScript, Tailwind CSS)
Backend: NestJS 10.3 (Express platform, TypeScript, Passport-JWT)
AI: FastAPI 0.110 (Python 3.11/3.13, Uvicorn, NVIDIA NIM Cloud API / Mock Provider)
Database: PostgreSQL 16 (TypeORM 0.3.20, `uuid-ossp` extension, 60 relational tables)
Storage: Local filesystem (`uploads/evidence/`, configurable `UPLOADS_DIR`, 15 MB max limit)

---

## PostgreSQL

Migration system: TypeORM Migrations (`migration:run` and compiled `migration:run:prod`)
Fresh database test: **PASSED**. Initialized separate clean database `samadhan_setu_deploy_test` from zero tables.
Tables automatically created: **60 of 60 tables created** automatically via 22 migrations with zero manual SQL table creation.
Seed status: **PASSED**. `seed:run:prod` populated master capabilities, industry sectors, support types, and all baseline demo accounts without errors.

---

## Frontend

Build: **PASSED**. `npm run build` completed successfully; all 17 static and dynamic route bundles compiled without errors.
Production configuration: Hardcoded localhost rewrites in `next.config.js` decoupled to dynamic `BACKEND_URL` / `NEXT_PUBLIC_API_URL`. All 19 API fetch points use `process.env.NEXT_PUBLIC_API_URL`.
Status: **READY FOR HOSTING TEST**

---

## Backend

Build: **PASSED**. `nest build` completed successfully producing runnable `dist/` bundle.
Start: **PASSED**. Tested in production mode (`node dist/main.js`) on fresh database instance; booted and served requests cleanly.
Database: Configured to support unified connection strings (`DATABASE_URL` with `sslmode=require` / `DATABASE_SSL`) and discrete parameters.
CORS: Environment-driven allowed origins (`CORS_ORIGIN`) with origin reflection fallback for credential safety.
Status: **READY FOR HOSTING TEST**

---

## AI Service

Runtime: Python 3.10+ (FastAPI + Uvicorn)
Provider: NVIDIA NIM Cloud API (`meta/llama-3.2-11b-vision-instruct`, `nvidia/nemotron-3-embed-1b`, `nvidia/rerank-qa-mistral-4b`) with built-in zero-cost deterministic mock fallback (`AI_PROVIDER=mock`).
Required credentials: `NVIDIA_API_KEY` (only required when `AI_PROVIDER=nvidia`; no credentials required for mock mode).
Free-hosting compatibility: **Compatible**. The FastAPI gateway is lightweight (<100MB RAM) and runs comfortably on free hosting tiers (e.g. Render Web Service). It does *not* run large local model weights in memory; external inference calls NVIDIA NIM API or uses the built-in mock engine.

---

## Media Storage

Current implementation: Local disk storage via Node.js `fs` streams at `UPLOADS_DIR` (`uploads/evidence/`).
Production requirement: Ephemeral cloud containers (Render/Railway free tiers) discard local filesystem changes on restart/redeploy. Production hosting requires either:
1. Attaching a persistent volume at `UPLOADS_DIR` (e.g., Render Disk at `/data/uploads`), or
2. Configuring an S3-compatible cloud object storage adapter (Cloudflare R2, AWS S3, or Supabase Storage).
Status: **INFRASTRUCTURE REQUIREMENT IDENTIFIED**

---

## Free Hosting

Frontend: **Vercel** (Hobby Free Tier — unlimited static/SSR hosting, global CDN, zero config for Next.js)
Backend: **Render** (Free Web Service — 512MB RAM, Node.js 20 runtime, supports health checks)
Database: **Neon.tech** (Free Serverless Postgres — 0.5 GB storage, autoscaling compute, PostgreSQL 16)
AI: **Render** (Free Web Service running FastAPI microservice with `AI_PROVIDER=mock` or NVIDIA NIM)
Storage: **Cloudflare R2** (10 GB free storage, $0 egress fees) or local persistent volume mount

---

## Genuine Blockers

No code-level blockers remain. 

*(Infrastructure prerequisite note: Ephemeral hosting platforms require mounting a persistent disk volume or an S3-compatible storage bucket to persist uploaded evidence files across container redeployments).*

---

## Recommended Hosting Architecture

```
[ Citizen / Admin Client Browser ]
               │
               ▼
   [ Vercel: Next.js Frontend ]
   (https://resolvin.vercel.app)
               │
               ▼  (NEXT_PUBLIC_API_URL / CORS_ORIGIN)
   [ Render: NestJS Backend API ]
   (https://resolvin-api.onrender.com)
         │                   │
         │ (DATABASE_URL)    ▼ (AI_SERVICE_URL)
         ▼         [ Render: FastAPI AI Microservice ]
 [ Neon.tech: Postgres ]    (https://resolvin-ai.onrender.com)
  (0.5GB Serverless DB)              │
                                     ▼ (NVIDIA_API_KEY)
                           [ NVIDIA NIM Cloud API ]
```

---

## Next Deployment Steps

1. Create a free PostgreSQL 16 database on **Neon.tech** and copy the connection string (`DATABASE_URL`).
2. Deploy the backend to **Render** as a Web Service:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run migration:run:prod && npm run seed:run:prod && npm run start:prod`
   - Set environment variables: `DATABASE_URL`, `DATABASE_SSL=true`, `JWT_SECRET`, `NODE_ENV=production`.
3. Deploy the AI service to **Render** as a Web Service:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port 8000`
   - Set environment variables: `AI_PROVIDER=mock` (or `nvidia` + `NVIDIA_API_KEY`).
4. Link `AI_SERVICE_URL` in the Render backend service settings.
5. Deploy the frontend to **Vercel**:
   - Framework preset: Next.js
   - Set environment variable: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api`
6. Update `CORS_ORIGIN` in the backend service to match your deployed Vercel URL.
7. Perform end-to-end smoke test (Citizen registration/login, problem submission, and administrative dashboard verification).

---

DEPLOYMENT PREPARATION STATUS:
READY FOR HOSTING TEST
