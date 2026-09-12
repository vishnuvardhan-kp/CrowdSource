# SamadhanSetu — Societal Innovation Collaboration Platform

[![Phase](https://img.shields.io/badge/Phase-3%20Authentication%2C%20Roles%20%26%20Organization%20Membership-brightgreen.svg)](./README.md)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

---

## 1. What is SamadhanSetu?

**SamadhanSetu** is an AI-enabled societal innovation collaboration platform built for Smart India Hackathon (SIH '26). 

The platform bridges the gap between grassroots societal problems and institutional solutions by connecting:

```text
Citizens → Societal Challenges → AI Analysis → Validation → Capability Matching → Universities + Industry → Project Execution → Community Verification → Impact Measurement
```

- **Citizens** submit real-world challenges with location, descriptions, and media.
- **AI Service** classifies, prioritises, summarises, and flags duplicate issues using semantic vector search.
- **Universities & HEIs** adopt challenges into student/faculty R&D projects based on verified research capabilities.
- **Industry Partners** offer mentorship, tech stack access, prototyping facilities, and funding.
- **Government Analytics** gain real-time visibility into societal impact metrics and accountability.

---

## 2. Current Implementation Phase

**Phase 3: Authentication, Roles & Organization Membership**

Phase 3 introduces the identity and access-control foundation for SamadhanSetu. It establishes secure user registration, bcrypt password hashing, stateless JWT authentication, reusable NestJS guards (`JwtAuthGuard`, `RolesGuard`), role-based access control (RBAC), multi-tenant organization memberships, and an organization claim-request foundation.

### Implemented in Phase 3:
- **User Registration (`POST /api/auth/register`)**: Email normalization, duplicate check (409 Conflict), bcrypt hashing (10 salt rounds), strict default role assignment to `CITIZEN`. Client privilege escalation attempts are rejected and stripped.
- **User Login (`POST /api/auth/login`)**: Secure credential verification with `bcrypt.compare`, account active check, signed JWT access token generation with minimum necessary claims (`sub`, `email`, `role`).
- **Protected Profile (`GET /api/auth/me`)**: Returns safe user profile with linked organization and active memberships, strictly omitting `password_hash`.
- **Reusable Guards (`JwtAuthGuard`, `RolesGuard`)**: Extensible guards enforcing 401 Unauthorized for missing/invalid tokens and 403 Forbidden for insufficient role permissions.
- **Role-Based Access Control (RBAC)**: Support for 9 granular platform roles (`CITIZEN`, `UNIVERSITY_ADMIN`, `FACULTY`, `STUDENT`, `INDUSTRY_ADMIN`, `INDUSTRY_MEMBER`, `GOVERNMENT_ADMIN`, `GOVERNMENT_OFFICER`, `PLATFORM_ADMIN`).
- **Organization Membership Model**: Normalized `organization_memberships` table supporting many-to-many user-organization relations with organization roles (`ADMIN`, `MEMBER`) and statuses (`ACTIVE`, `PENDING`, `INACTIVE`, `REVOKED`).
- **Organization Claim Foundation**: Dedicated `organization_claim_requests` table and endpoints (`POST /api/organization-claims`, `GET /api/organization-claims`). Claims are initialized in `PENDING` status and grant zero elevated privileges until future verification.
- **Minimal Authentication UI**: Responsive Next.js 14 interface featuring login/registration tabs, quick-fill development credentials, decoded profile inspect, live RBAC role-guard test button, public organization search directory, and claim request submissions.
- **Comprehensive Automated Test Suites**: 126 automated assertions across Phase 2 database schema, Phase 3 authentication/authorization logic, and live HTTP API integration testing (`npm test`).

### Deferred to Future Phases (Explicitly NOT Implemented in Phase 3):
- No Challenge submission workflow (Phase 4+)
- No AI model inference / vector matching algorithms (Phase 4+)
- No Project management workflow / Funding workflow (Phase 5+)
- No Government analytics dashboard (Phase 6+)
- No Full automated organization verification pipeline / file uploads / OAuth / OTP services

---

## 3. Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js, NestJS 10, TypeScript, Passport.js, Passport-JWT, Bcrypt.js, TypeORM 0.3, REST API (`/api`) |
| **AI Service** | Python 3.11+, FastAPI, Uvicorn, Pydantic (Standby foundation) |
| **Database** | PostgreSQL 16 (`uuid-ossp` for primary keys, `pgvector` readiness) |
| **Infrastructure** | Embedded PostgreSQL runner / Docker Compose |
| **Testing** | TypeScript automated verification suites (126 assertions via `npm test`) |

---

## 4. Authentication Architecture

```text
User
 ↓
Registration (POST /api/auth/register)
 ↓
Role: CITIZEN (Strict default; privilege escalation stripped)
 ↓
Login (POST /api/auth/login)
 ↓
JWT Token Issued (sub: user_id, role: user_role)
 ↓
JwtAuthGuard (Validates Bearer token → 401 if missing/invalid)
 ↓
RolesGuard (@Roles(...) check → 403 if insufficient permissions)
 ↓
Protected Resources (e.g. /api/auth/me, /api/auth/admin-test)
```

---

## 5. Organization Membership & Claim Architecture

```text
User
 ↓
Search Public Organizations (GET /api/organizations)
 ↓
Submit Claim Request (POST /api/organization-claims)
 ↓
Claim Status: PENDING (Zero admin access granted)
 ↓
Future Administrative Verification
 ↓
Approved Claim → Organization Membership Created (ADMIN or MEMBER)
```

### Critical Architectural Principles

> [!IMPORTANT]
> **Authentication is NOT the same as organization verification.**
> A platform account does not automatically establish organizational authority. A user can register and have a fully authenticated platform account (`CITIZEN`) without being a verified representative of any institution or company.

> [!IMPORTANT]
> **Independent Public Organization Profiles.**
> Organization profiles (universities, colleges, industry partners) exist in the database independently of user accounts. They can be created from public registry records (e.g., AISHE/NIRF) and claimed later by authorized representatives through the claim-request workflow.

---

## 6. Platform Roles vs. Organization Roles

SamadhanSetu strictly decouples **Platform Roles** from **Organization Roles**:

| Platform Role | Scope | Description |
| :--- | :--- | :--- |
| `CITIZEN` | Global | Default user identity; reports problems and participates in community validation |
| `UNIVERSITY_ADMIN` | Institutional | Academic administrator managing institution capabilities and projects |
| `FACULTY` | Institutional | Academic researcher/instructor leading innovation R&D projects |
| `STUDENT` | Institutional | Student innovator collaborating on challenge solutions |
| `INDUSTRY_ADMIN` | Corporate | Industry administrator managing corporate partnership and sponsorships |
| `INDUSTRY_MEMBER` | Corporate | Technical specialist providing mentorship and hardware/software support |
| `GOVERNMENT_ADMIN` | Governance | Public administrator monitoring regional societal impact and funding |
| `GOVERNMENT_OFFICER` | Governance | Municipal/departmental official tracking issue resolution |
| `PLATFORM_ADMIN` | System | Superuser managing platform governance, verification, and claim approvals |

Inside any specific organization, memberships are tracked via `organization_memberships`:
- `ADMIN`: Authorized representative with organizational management permissions.
- `MEMBER`: General member/researcher/collaborator affiliated with the organization.

---

## 7. API Endpoints (Phase 3)

### Authentication & Profile
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user account (strictly defaults to `CITIZEN`) |
| `POST` | `/api/auth/login` | Public | Authenticate with email & password, returns JWT token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile with organization memberships |
| `GET` | `/api/auth/admin-test` | `PLATFORM_ADMIN` | RBAC test route (returns 200 for Platform Admin, 403 for other roles) |

### Organizations & Claims
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/organizations` | Public | Search and list public organization profiles |
| `GET` | `/api/organizations/:id` | Public | Retrieve single organization details |
| `GET` | `/api/organizations/:id/members` | Authenticated | Retrieve members belonging to an organization |
| `POST` | `/api/organization-claims` | Authenticated | Submit an organization claim request (status: `PENDING`) |
| `GET` | `/api/organization-claims` | Authenticated | List submitted claims (Admin sees all; users see their own) |

### System Health
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Dynamic backend and database health status |

---

## 8. Development Commands & Testing

### 1. Start PostgreSQL (Local Embedded Runner)
```bash
cd backend
node scripts/run-dev-postgres.js
```

### 2. Run Database Migrations
```bash
cd backend
npm run migration:run
```

### 3. Run Development Seed
```bash
cd backend
npm run seed:run
```

*Pre-configured development demo credentials:*
- **Platform Admin:** `admin@dev.local` / `AdminDev123!`
- **Demo Citizen:** `citizen@dev.local` / `CitizenDev123!`

### 4. Run Automated Test Suites
```bash
cd backend
npm test
```
*Executes all 3 verification suites:*
- `npm run test:phase2`: Database entity metadata & relational integrity (61 assertions)
- `npm run test:phase3`: Authentication, registration, login, bcrypt, JWT, and RBAC logic (38 assertions)
- `verify-http-api.ts`: End-to-end HTTP API tests against live NestJS server (27 assertions)
- **Total: 126 automated assertions passing (0 failures)**

### 5. Start Backend Service
```bash
cd backend
npm run start:dev
```
Backend API available at: `http://localhost:3001/api`

### 6. Start Frontend App
```bash
cd frontend
npm run dev
```
Frontend UI available at: `http://localhost:3000`

---

## 9. Next Phase Roadmap

**Phase 4 — Grassroots Challenge Submission & Multimodal Evidence Pipeline**
- Citizen challenge reporting workflow with location and district tags
- Multimodal evidence handling (photos, documents, coordinates)
- Challenge triage and validation state machines
- Initial vector embedding integration with AI Service
