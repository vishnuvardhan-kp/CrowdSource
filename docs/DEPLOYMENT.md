# SamadhanSetu — Production Deployment Guide

This document outlines the verified configuration requirements for deploying SamadhanSetu into staging and production environments.

---

## 1. Runtime Requirements

| Component | Minimum Version | Recommended | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | 18.18.0 | 20.x LTS | Required for Backend and Frontend |
| **PostgreSQL** | 14.0 | 16.x | Requires `uuid-ossp` extension |
| **Python** | 3.10 | 3.11 | Required for AI microservice (if running) |
| **Disk Storage** | 2 GB | 10 GB+ | Required if storing uploaded media locally |

---

## 2. Environment Variables Configuration

### Backend API (`backend/.env`)
```bash
# Server Configuration
PORT=3001
NODE_ENV=production
APP_NAME=SamadhanSetu

# Security (Required in Production)
JWT_SECRET=your-strong-random-32-char-secret-key-here
JWT_EXPIRES_IN=7d

# PostgreSQL Database
DATABASE_HOST=your-postgres-host
DATABASE_PORT=5432
DATABASE_NAME=samadhan_setu
DATABASE_USER=your-db-user
DATABASE_PASSWORD=your-db-password

# AI Service Integration
AI_SERVICE_URL=http://localhost:8000
AI_PROVIDER=nvidia # Options: nvidia, mock
NVIDIA_API_KEY=nvapi-your-key-here
LLM_MODEL=meta/llama-3.2-11b-vision-instruct

# Multilingual Voice (Optional)
SARVAM_API_KEY=your-sarvam-key-here
```

### Web Frontend (`frontend/.env.production` or platform env)
```bash
# Backend API Base URL
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

---

## 3. Database Migration & Initialization

Run migrations against the production database before booting the API service:

```bash
cd backend
# Execute TypeORM migrations
npm run migration:run

# (Optional) Seed standard LGD administrative districts and test fixtures
npm run seed:run
```

---

## 4. Production Build Commands

### Backend Service:
```bash
cd backend
npm install --omit=dev
npm run build
# Starts compiled service from dist/
npm run start:prod
```

### Frontend Web Portal:
```bash
cd frontend
npm install --omit=dev
npm run build
# Starts optimized production Next.js server
npm run start
```

### AI Service:
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
```

---

## 5. Media & Upload Storage Considerations

In the current development setup, files are saved to the local directory `backend/uploads/`:
- `uploads/evidence/` — Citizen problem images and documents
- `uploads/deliverables/` — Prototype blueprints and testing reports
- `uploads/impact-evidence/` — NABL lab test certificates and photos

> **Production Notice:** Containerized, ephemeral, or serverless hosts (e.g., Render free tier, Vercel, Railway) do not provide persistent local disk storage across redeployments. For durable production storage, mount a persistent volume to `uploads/` or configure an S3-compatible cloud storage adapter (e.g., AWS S3, Supabase Storage, Cloudinary).
