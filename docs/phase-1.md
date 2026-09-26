# Phase 1 — Platform Foundation

## Objective

Establish a clean, modular, and scalable multi-service architecture baseline for **SamadhanSetu**, uniting a Next.js frontend, a NestJS backend, a Python FastAPI AI microservice, and a PostgreSQL database with relational and vector extension readiness.

## Problem Being Solved

Before implementing business domains, societal collaboration workflows, or AI capabilities, the platform required a standardized, containerized, and reproducible development foundation. Disparate technologies (TypeScript for Web/Backend and Python for AI) needed to be structured so they could run independently while integrating cleanly over standard HTTP protocols.

## Actors / Users Involved

* **Platform Developers & DevOps Engineers**: Initialize the platform, execute migrations, configure environment variables, and verify service health.

## Functional Requirements

* **Multi-Service Layout**: Establish segregated folders for `frontend/`, `backend/`, `ai-service/`, and `database/`.
* **Backend Architecture**: Establish a NestJS modular monolith with a global `/api` routing prefix, class-transformer validation pipes, and CORS enablement.
* **Frontend Architecture**: Configure Next.js 14 (App Router) with TypeScript, Tailwind CSS, and Lucide icons.
* **AI Service Architecture**: Configure Python 3.11+ with FastAPI, Uvicorn, and Pydantic as an isolated intelligence microservice.
* **Database Readiness**: Establish PostgreSQL 16 initialization with `uuid-ossp` and `pgvector` extensions.
* **Health Monitoring**: Implement dynamic health check endpoints on both NestJS (`/api/health`) and FastAPI (`/health`) that report runtime status, dynamically derived service slugs, and database connectivity.
* **Configurability**: Strict environment variable isolation using `.env` files and `@nestjs/config`.

## System Flow

```text
Client Browser (Port 3000)
       │
       ▼
Next.js 14 Frontend UI
       │
       ├─── HTTP REST ────► NestJS Backend (/api, Port 3001)
       │                         │
       │                         ├─── TypeORM Protocol ───► PostgreSQL 16 (Port 5432)
       │                         │                           (uuid-ossp, pgvector)
       │                         │
       │                         └─── Internal HTTP ──────► FastAPI AI Service (Port 8000)
       ▼                                                     (/health)
Status Dashboard
```

## Modules

* **`HealthModule`** (`backend/src/health/`): Exposes `GET /api/health` providing dynamic service slug derivation from `APP_NAME`, process status, and database connectivity check.
* **`DatabaseModule`** (`backend/src/database/`): Manages TypeORM connection pool and CLI data source configuration.
* **`ConfigModule`** (`backend/src/config/`): Loads `appConfig` and `databaseConfig` from environment variables.
* **FastAPI Main Application** (`ai-service/app/main.py`): Standalone ASGI app serving CORS-enabled health probes.

## Frontend

* **Technology**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS.
* **Role**: Initial landing page (`frontend/src/app/page.tsx`) displaying the platform title, core mission description, and live health status indicators querying the backend and AI service.

## Backend

* **Technology**: NestJS 10, TypeScript, Express, TypeORM.
* **Role**: Core application server with global routing prefix `/api`, global validation pipe stripping non-whitelisted payload properties, and dynamic CORS configuration.

## Database

* **Technology**: PostgreSQL 16.
* **Extensions**:
  * `uuid-ossp`: For generating UUID primary keys.
  * `pgvector`: Pre-configured for future vector embedding storage and similarity indexing.
* **Configuration**: Managed via `docker-compose.yml` and `database/init.sql`.

## AI/ML

* **Technology**: Python 3.11, FastAPI, Uvicorn.
* **Phase 1 Role**: Standby service foundation with health check endpoint (`GET /health`). No machine learning models, inference pipelines, or vector calculations are loaded in this phase.

## APIs

| Method | Endpoint | Service | Access | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Backend (NestJS) | Public | Reports application name, service status, uptime, and database connection state |
| `GET` | `/health` | AI Service (FastAPI) | Public | Reports microservice availability and operational status |

## Security / Validation

* Environment variables isolated in `.env` and `.env.example`; excluded from git via `.gitignore`.
* NestJS `ValidationPipe` enabled globally with `whitelist: true` to prevent mass-assignment attacks.
* Safe fallback configurations for local developer convenience without hardcoding production secrets.

## Inputs

* Environment variables: `PORT`, `BACKEND_PORT`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, `APP_NAME`, `AI_SERVICE_URL`.

## Outputs

* Dynamic JSON health payload from backend: `{ status, timestamp, service, appName, database: { status, type } }`.
* Running application instances on ports 3000 (Frontend), 3001 (Backend), 8000 (AI Service), and 5432 (PostgreSQL).

## Current Implementation

* Fully implemented and verified.
* All configuration files, Docker specifications, and health endpoints are operational.

## Dependencies

* Node.js 20+
* Docker & Docker Compose / Local PostgreSQL
* Python 3.11+ with pip virtual environment

## Decisions Made

1. **Monorepo-style Single Workspace**: Kept `frontend`, `backend`, `ai-service`, and `database` in a single repository for simplified collaboration during the hackathon.
2. **NestJS over Express**: Selected NestJS for its enterprise architectural discipline, modular organization, and first-class TypeORM support.
3. **Dedicated Python Microservice**: Kept AI workloads in a specialized Python FastAPI service rather than executing ML in Node.js, ensuring native access to PyTorch, Hugging Face, and NumPy in future phases.
4. **PostgreSQL with Vector Readiness**: Selected PostgreSQL with `pgvector` to consolidate relational data and vector embeddings into a single database engine.

## Future Enhancements

* Entity modeling and relational database schemas (implemented in Phase 2).
* User authentication and role-based access control (implemented in Phase 3).
* Challenge reporting and crowdsourcing foundation (implemented in Phase 4).

## Status

**Completed**.
