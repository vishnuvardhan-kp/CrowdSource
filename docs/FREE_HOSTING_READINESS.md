# Free Hosting Readiness

This audit evaluates the feasibility of deploying the current SamadhanSetu platform using free-tier cloud hosting providers.

---

## Current Architecture

- **Frontend:** Next.js 14 (App Router, React 18, TypeScript, Tailwind CSS)
- **Backend:** NestJS 10 (Node.js, Express, TypeORM 0.3, REST API on port 3001)
- **Database:** PostgreSQL 16 (Relational schema, UUID primary keys, LGD spatial dataset)
- **AI:** Python 3.10+ FastAPI microservice on port 8000 (NVIDIA NIM API / Sarvam API with deterministic fallback)
- **Storage:** Local filesystem (`backend/uploads/`)
- **GIS:** Bundled EPSG:4326 SVG vector boundary paths (zero external map server dependencies)

---

## Ready for Free Hosting

- **Web Frontend:** Fully compatible with **Vercel** (Hobby Free Tier) or **Netlify**. Provides free SSL, global CDN, zero-config Next.js 14 support, and custom domains.
- **Backend API:** Compatible with **Render** (Free Web Service), **Koyeb** (Free Eco instance), or **Railway** ($5 credit/trial).
- **PostgreSQL Database:** Compatible with **Supabase** (Permanent Free 500MB PostgreSQL) or **Neon** (Free 0.5GB Serverless Postgres).
- **GIS Heatmap:** 100% free-tier ready. All 24 Jharkhand district boundaries are compiled into lightweight client SVG geometry (`jharkhand-real-boundaries.json`); zero external Mapbox or Google Maps API tokens are required.

---

## Requires Configuration

The following environment variables and settings must be configured for cloud hosting:

1. **Frontend (`frontend/.env.production` or Vercel Environment Variables):**
   - `NEXT_PUBLIC_API_URL`: Public HTTPS URL of the deployed backend API (e.g., `https://samadhansetu-api.onrender.com/api`).

2. **Backend API (`backend/.env` or Render Environment Variables):**
   - `NODE_ENV`: Set to `production`.
   - `PORT`: Automatically provided by the hosting environment.
   - `JWT_SECRET`: Random 32+ character secret string (required for production).
   - `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`: Remote PostgreSQL connection parameters from Supabase or Neon.
   - `AI_SERVICE_URL`: URL of the deployed AI service, or set `AI_PROVIDER=mock` to use the zero-cost deterministic fallback.
   - `NVIDIA_API_KEY`: API key for NVIDIA NIM cloud inference (if active).

---

## Production Blockers & Risks

1. **Ephemeral File & Media Storage (Genuine Blocker for Uploads):**
   - The current backend writes file uploads (evidence photos, prototype deliverables, NABL certificates) directly to the local disk directory (`backend/uploads/`).
   - Free container platforms (Render, Koyeb, Vercel) have **ephemeral filesystems** that reset upon restart or redeployment. Uploaded files will be lost when containers restart.
   - *Resolution:* For durable production storage, media uploads must either mount a persistent disk volume or configure an object storage adapter (e.g., Supabase Storage, Cloudinary Free Tier, or AWS S3).

2. **Server Cold Starts & Idle Sleep:**
   - Free-tier web services on Render or Koyeb spin down after 15 minutes of inactivity. Initial requests after idle sleep will experience a 30 to 50-second cold start delay.

3. **External AI Inference Quota Limits:**
   - The platform relies on external cloud inference (NVIDIA NIM) for the 11B vision-language model. Free developer tier keys have request quotas and rate limits.
   - *Mitigation:* The system includes an automated fallback mechanism that continues functioning deterministically when API quotas are reached.

---

## Recommended Free Architecture

```text
Frontend (Vercel Free Tier)
       │
       ▼ HTTPS (CORS enabled)
Backend API (Render Free Web Service)
       │
       ├───► PostgreSQL (Supabase Free Tier / Neon Serverless)
       │
       ├───► Media Storage (Supabase Storage / Cloudinary Free Tier)
       │
       └───► AI Inference (NVIDIA NIM Free Tier / Local Deterministic Fallback)
```

---

## Deployment Steps

1. **Database:**
   - Create a free project on Supabase or Neon.
   - Retrieve connection credentials (`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`).
   - Run migrations from a local terminal:
     ```bash
     cd backend
     npm run migration:run
     npm run seed:run
     ```

2. **Backend:**
   - Create a new Web Service on Render linked to the GitHub repository.
   - Set Root Directory to `backend`, Build Command to `npm install && npm run build`, and Start Command to `npm run start:prod`.
   - Add required environment variables (`DATABASE_*`, `JWT_SECRET`, `NODE_ENV=production`).

3. **Frontend:**
   - Import the repository on Vercel.
   - Set Root Directory to `frontend`.
   - Add environment variable `NEXT_PUBLIC_API_URL=https://<your-render-backend-url>/api`.
   - Deploy.

---

## Limitations of Free Hosting

- **Cold Starts:** Backend will take 30-50s to wake up after 15 minutes of inactivity.
- **Database Inactivity Pause:** Supabase free databases pause if inactive for 7 consecutive days.
- **Storage Limits:** 500 MB database storage limit on free tiers; large multimedia (high-res videos) should be limited to 10MB per submission.
- **AI Rate Limits:** Cloud LLM inference is limited by free provider rate cards.
