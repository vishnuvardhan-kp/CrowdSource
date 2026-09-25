# SamadhanSetu

> AI-powered civic problem intelligence, university research matching, and multi-stakeholder innovation collaboration platform.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)
[![Frontend: Next.js 14](https://img.shields.io/badge/Frontend-Next.js%2014-black.svg)](./frontend)
[![Backend: NestJS 10](https://img.shields.io/badge/Backend-NestJS%2010-red.svg)](./backend)
[![AI: Python FastAPI](https://img.shields.io/badge/AI-FastAPI%20%7C%20NVIDIA%20NIM-teal.svg)](./ai-service)

---

## Problem Statement

Grassroots civic and societal challenges often remain unaddressed due to fragmented reporting, lack of technical structure, and disconnect between community needs, academic research capabilities, industrial resources, and administrative governance. Meanwhile, universities conduct applied R&D that rarely connects directly to verifiable local civic problems, and government officials lack real-time geographic visibility into problem density, institutional pilots, and verified societal impact.

---

## Solution

**SamadhanSetu** bridges this gap by creating an end-to-end innovation pipeline connecting citizens, universities, industries, and government administration:

```text
Citizen Report
  ↓
AI Problem Understanding (Refinement, Categorization, Clustering)
  ↓
University Capability Matching & Recommendation
  ↓
Proposed Solution (Non-confidential summary + Protected IP blueprint)
  ↓
Industry / Ecosystem Collaboration (Funding, Prototyping, Testing, Pilot)
  ↓
Project Lifecycle (Planning → Prototype → Testing → Pilot → Deployment → Completion)
  ↓
Impact & Innovation (Beneficiaries, NABL Evidence, Patents, Startups, Tech Transfer)
  ↓
Government Analytics (Authentic 24-District Jharkhand Heatmap, Oversight & Audit)
```

---

## Key Features

- **Citizen Problem Submission:** Multilingual web and mobile intake with GPS geolocation, block/district mapping, and offline draft persistence.
- **Multimedia Evidence:** Direct photo, video, and document uploads attached to civic challenges.
- **AI Problem Refinement & Classification:** Professional civic problem statement synthesis, zero-fabrication citizen fact extraction, and taxonomy mapping across 18 municipal domains.
- **Semantic Matching & Recommendation:** Vector similarity matching linking validated problems to verified higher education institution (HEI) technical capabilities and laboratory facilities.
- **Deduplication & Clustering:** Semantic duplicate detection and spatial clustering grouping related citizen reports into community signals.
- **Proposed Solutions & IP Protection:** Universities publish non-confidential solution summaries to the Open Solution Workspace while keeping proprietary technical blueprints masked until consortium acceptance.
- **Multidisciplinary University Teams:** Academic rosters uniting faculty mentors, student researchers, and campus coordinators across engineering and sciences.
- **Industry & Ecosystem Collaboration:** Corporate enterprises, MSMEs, startups, CSR units, and research labs submit financial (co-funding) or non-financial (prototyping, testing, deployment) collaboration offers.
- **Private Stakeholder Communication:** Four-state access-controlled forum restricted exclusively to the citizen submitter, lead university, and accepted consortium partners.
- **Project Lifecycle Tracking:** Phased milestone execution: Planning, Prototype Development, Testing & Validation, Pilot Deployment, Operational Handover, and Completion.
- **Innovation & Tech Transfer Register:** IP assessment, Indian Patent Office application/grant tracking, academic startup spin-offs, and government technology transfer agreements.
- **Verified Social Impact:** Direct citizen beneficiary counts, categorical metrics (Health, Livelihood, Education, Environment, Infrastructure), NABL lab test certificates, and citizen feedback.
- **Government Analytics & Real GIS Heatmap:** Geographically realistic 24-district Jharkhand boundary choropleth (EPSG:4326 Survey/LGD geometry), district comparative matrix, domain velocity timelines, and administrative oversight.

---

## User Roles

| Role | Responsibilities | Primary Interface |
| :--- | :--- | :--- |
| **Citizen** | Reports civic challenges, uploads media evidence, tracks progress, submits community feedback. | Web (`/challenges/new`), Mobile App |
| **University** | Reviews matched problems, submits proposed solutions, forms multidisciplinary faculty-student teams, executes projects. | University Portal (`/university-dashboard`, `/solutions`) |
| **Industry / Ecosystem** | Discovers open solutions, provides CSR/co-funding, technical mentoring, prototyping facilities, and field pilots. | Open Solution Workspace (`/solutions`), Project Workspace (`/projects/[id]`) |
| **Government** | Monitors problem hotspots, reviews submissions, certifies social impact assessments, audits innovation outcomes. | Government Intelligence Dashboard (`/government-dashboard`) |
| **Platform Admin** | Platform maintenance, institution onboarding, taxonomy management, system health telemetry. | Reviewer Queue (`/reviewer-queue`), Admin Telemetry |

---

## System Flow

```text
+------------------+         +--------------------------+         +-----------------------+
|  Citizen Mobile  |  POST   |   NestJS Backend API     |   Sync  |   PostgreSQL 16 DB    |
|   / Web Intake   | ------> |  (/api/challenges)       | ------> |  (720+ Civic Records, |
+------------------+         +--------------------------+         |   24 LGD Districts)   |
                                       |                          +-----------------------+
                                       | POST /analyze-challenge
                                       v
                             +--------------------------+
                             |     Python AI Service    |
                             |  - NVIDIA NIM / Llama    |
                             |  - Zero-Fabrication Tier |
                             |  - Deterministic Fallback|
                             +--------------------------+
                                       |
                                       v
+------------------+  Offer  +--------------------------+         +-----------------------+
| Industry / CSR   | ------> | Open Solution Workspace  | Convert |   Project Workspace   |
| (Funding, Pilot) |         | (BIT Mesra, NIT Jamshed.)| ------> | (Planning → Deploy)   |
+------------------+         +--------------------------+         +-----------------------+
                                                                              |
                                       +--------------------------------------+
                                       v
                             +--------------------------+
                             |   Government Dashboard   |
                             |  - Real GIS Heatmap      |
                             |  - 24-District Analytics |
                             |  - Impact & IP Register  |
                             +--------------------------+
```

---

## AI / ML Architecture

SamadhanSetu integrates a provider-agnostic Python microservice paired with a deterministic backend fallback:

- **Civic Problem Structuring & Refinement:** Utilizes external cloud LLM inference via NVIDIA NIM (`meta/llama-3.2-11b-vision-instruct`) or Sarvam API for multilingual speech-to-text. The model transforms colloquial citizen submissions into formal civic statements without altering the original immutable text. Note: The foundational LLM was not trained by us; we designed specialized prompt contracts and extraction constraints.
- **Zero-Fabrication Architecture:** Citizen-reported facts are strictly extracted from the citizen utterance alone. Administrative metadata (district, block, locality) is appended exclusively from verified platform database records.
- **Categorization & Prioritization:** Automated mapping into 18 municipal taxonomy categories with priority scoring (CRITICAL, HIGH, MEDIUM, LOW) derived from civic severity, citizen confirmations, and AI analysis.
- **Semantic Embeddings & Clustering:** Computes vector embeddings to detect duplicates and cluster nearby problem reports into community clusters.
- **Capability Matching:** Ranks higher education institutions against problem requirements based on verified laboratory capabilities, operational jurisdiction, and research specializations.
- **Deterministic Offline Fallback:** If cloud AI inference is unavailable or API keys are omitted, the system automatically falls back to internal rule-based structuring and mock providers with zero downtime.

---

## Technology Stack

- **Web Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React Icons
- **Mobile Frontend:** React Native, Expo SDK 57, TypeScript, React Navigation
- **Backend API:** Node.js, NestJS 10, TypeScript, TypeORM 0.3, Passport-JWT, Bcrypt.js
- **Database:** PostgreSQL 16 (Relational schema, UUID primary keys, LGD spatial dataset)
- **AI / ML Microservice:** Python 3.10+, FastAPI, Uvicorn, Pydantic, NVIDIA NIM API, Sarvam API
- **GIS & Cartography:** Official EPSG:4326 GeoJSON simplified SVG vector paths, Green's Theorem centroid calculation
- **File & Media Storage:** Local file system storage (`uploads/evidence`, `uploads/deliverables`, `uploads/impact-evidence`)

---

## Project Structure

```text
Crowdsource/
├── frontend/               # Next.js 14 web application
│   ├── src/app/            # App Router pages (/challenges, /solutions, /projects, /government-dashboard)
│   ├── src/lib/            # Auth context, API client, forum access logic, utilities
│   └── public/             # Static public assets
├── backend/                # NestJS 10 REST API microservice
│   ├── src/modules/        # Core modules (auth, challenges, solutions, projects, impact, analytics)
│   ├── src/database/       # TypeORM entities, migrations, seed scripts
│   └── test/               # Automated test and integration verification suites
├── ai-service/             # FastAPI AI problem structuring & matching service
│   ├── app/providers/      # NVIDIA NIM, Sarvam, and Mock AI providers
│   ├── app/services/       # LLM inference and extraction pipelines
│   └── main.py             # FastAPI entrypoint (Port 8000)
├── Recommendation_engine/  # Recommendation & ranking service
├── mobile/                 # React Native / Expo SDK 57 mobile citizen app
├── docs/                   # Supporting architecture, deployment, and hosting documentation
└── scratch/                # Local integration and verification scripts
```

---

## Setup & Local Development

### Prerequisites
- Node.js 18.x or 20.x
- Python 3.10+ (with virtual environment support)
- PostgreSQL 14+ (or use the embedded runner)

### 1. Database Setup
```powershell
cd backend
# Run embedded development PostgreSQL instance:
node scripts/run-dev-postgres.js
# In a new terminal, execute migrations and initial seeds:
npm run migration:run
npm run seed:run
```

### 2. Backend API Setup
```powershell
cd backend
npm install
npm run start:dev
# Service runs on http://localhost:3001/api
# Health check: http://localhost:3001/api/health
```

### 3. AI Service Setup
```powershell
cd ai-service
python -m venv venv
.\venv\Scripts\activate      # Windows (or source venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
# Service runs on http://localhost:8000
```

### 4. Web Frontend Setup
```powershell
cd frontend
npm install
npm run dev
# Web Portal runs on http://localhost:3000
```

### 5. Mobile App Setup (Optional)
```powershell
cd mobile
npm install
npx expo start
```

---

## Testing & Verification Status

The codebase is thoroughly covered by automated integration test suites:

- **End-to-End Business Flow Suite (`test-phase7-e2e-business-flow.js`):** 61 / 61 checkpoints passed (100%)
- **Government Analytics & Impact Suite (`test-phase6-government-analytics-impact.js`):** 54 / 54 checkpoints passed (100%)
- **Backend Architecture & Production Readiness (`test-production-readiness-audit.ts`):** 49 / 49 checkpoints passed (100%)
- **Project Lifecycle Suite (`test-phase4-project-lifecycle.js`):** 47 / 47 checkpoints passed (100%)
- **Consortium & Collaboration Suite (`test-phase3-collaboration.js`):** 45 / 45 checkpoints passed (100%)
- **Innovation & IP Telemetry Suite (`test-phase5-innovation-ip.js`):** 43 / 43 checkpoints passed (100%)
- **University Team Multidisciplinary Suite (`test-phase2-university-team.js`):** 39 / 39 checkpoints passed (100%)
- **Open Solution Workspace Suite (`test-solution-workspace-e2e.js`):** 27 / 27 checkpoints passed (100%)
- **Private Stakeholder Communication Suite (`verify-forum.js`):** 23 / 23 checkpoints passed (100%)
- **Spatial Hotspots & GIS Heatmap Suite (`test-heatmap-and-demo.js`):** 6 / 6 checkpoints passed (100%)
- **Type Checking:** `npx tsc --noEmit` exits with 0 errors across frontend and backend.
- **Production Build:** `npm run build` compiles all 21 Next.js routes successfully.

---

## Deployment Notes

- **Environment Variables:** Set `NODE_ENV=production`, `PORT`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, `JWT_SECRET`, and `AI_SERVICE_URL`.
- **Media Persistence:** The current development configuration stores uploaded evidence and deliverables on the local filesystem (`uploads/`). For containerized or serverless hosting (e.g., Render, Vercel, Railway), configure durable persistent storage (e.g., AWS S3, Supabase Storage, or Cloudinary).
- **AI Inference:** The platform can run with external cloud inference keys (`NVIDIA_API_KEY`) or in offline mode utilizing the built-in deterministic fallback engine without GPU dependencies.
- Detailed hosting readiness is audited in [docs/FREE_HOSTING_READINESS.md](./docs/FREE_HOSTING_READINESS.md).

---

## License

This project is licensed under the [MIT License](./LICENSE).
