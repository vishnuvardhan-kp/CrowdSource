# Phase 3 — Authentication, Roles & Organization Membership

## Objective

Establish a secure, stateless, and scalable identity and access-control architecture for **SamadhanSetu**, implementing user registration, bcrypt password hashing, JWT authentication, reusable NestJS guards (`JwtAuthGuard`, `RolesGuard`), role-based access control (RBAC), multi-tenant organization memberships, and a decoupled organization claim workflow.

## Problem Being Solved

SamadhanSetu unites multiple distinct stakeholder groups: citizens, university faculty, student innovators, corporate mentors, government officers, and system administrators. Prior to Phase 3, there was no way to authenticate users, restrict administrative actions, or link individuals to universities or enterprises. Furthermore, the platform required a clear architectural boundary preventing standard authenticated users from self-assigning elevated platform roles or claiming authority over institutions without verification.

## Actors / Users Involved

### Decoupled Platform Roles (`UserRole`)

* **`CITIZEN`**: Default platform identity. Can report problems, upload evidence, and confirm community issues.
* **`UNIVERSITY_ADMIN`**: Academic institution administrator managing institution profiles, departments, faculty, and capabilities.
* **`FACULTY`**: Academic researcher and project investigator collaborating on challenge solutions.
* **`STUDENT`**: Student innovator collaborating on R&D projects.
* **`INDUSTRY_ADMIN`**: Corporate administrator managing company sponsorship, support types, and capabilities.
* **`INDUSTRY_MEMBER`**: Technical specialist providing engineering mentorship and testing access.
* **`GOVERNMENT_ADMIN`**: High-level governance authority monitoring regional impact.
* **`GOVERNMENT_OFFICER`**: Departmental/municipal official reviewing and validating challenge credibility.
* **`PLATFORM_ADMIN`**: System superuser managing platform governance, user roles, and claim approvals.

### Organization Roles (`OrganizationRole`)

Inside a specific organization (`organization_memberships`):
* **`ADMIN`**: Manager of the organization's platform profile.
* **`MEMBER`**: Verified researcher, faculty member, or employee affiliated with the organization.

## Functional Requirements

* **Secure User Registration (`POST /api/auth/register`)**:
  * Email normalization (lowercase and trim).
  * Duplicate check returning `409 ConflictException`.
  * Password hashing using bcrypt with 10 salt rounds.
  * Strict default role assignment to `CITIZEN`. Injected role fields from the client are discarded.
  * Sensitive data protection: `password_hash` is never returned in API responses.
* **User Login (`POST /api/auth/login`)**:
  * Credential verification with `bcrypt.compare`.
  * Active status validation (`is_active === true`).
  * Signed JWT access token issuance containing minimal necessary claims (`sub`, `email`, `role`).
* **Protected Profile Retrieval (`GET /api/auth/me`)**:
  * Returns authenticated user profile, primary organization, and active memberships.
* **Access Control Guards**:
  * `JwtAuthGuard`: Passport-JWT guard validating Bearer tokens; returns `401 Unauthorized` on failure.
  * `RolesGuard`: Reflector-based guard matching `@Roles(...)` decorator against token role; returns `403 Forbidden` on failure.
* **Organization Membership Management**:
  * Multi-tenant model linking users to organizations with roles (`ADMIN`, `MEMBER`) and statuses (`ACTIVE`, `PENDING`, `INACTIVE`, `REVOKED`).
  * Composite unique constraint `(user_id, organization_id)`.
* **Organization Claim Request System**:
  * Allows authenticated users to claim unverified/unclaimed public organization profiles.
  * Claims default to `PENDING` and confer **zero** elevated permissions until administrative review.

## System Flow

```text
Citizen / User
      │
      ▼
POST /api/auth/register
      │
      ├─── Password Hashing (bcrypt, 10 rounds)
      ├─── Role Enforcement (Strict CITIZEN default)
      └─── User Record Created (users table)
      │
      ▼
POST /api/auth/login
      │
      ├─── bcrypt.compare(password, password_hash)
      └─── Signs JWT (Payload: { sub: user_id, email, role })
      │
      ▼
Client Requests Protected Resource (Bearer Token)
      │
      ├─── JwtAuthGuard ───► Token Valid? ───► [NO] ──► 401 Unauthorized
      │                           │
      │                         [YES]
      │                           ▼
      └─── RolesGuard   ───► Role in @Roles? ──► [NO] ──► 403 Forbidden
                                  │
                                [YES]
                                  ▼
                         Controller Action Executed
```

## Modules

* **`AuthModule`** (`backend/src/modules/auth/`):
  * `AuthService`: Registration, login, profile loading, and password hashing logic.
  * `AuthController`: Public and protected authentication endpoints.
  * `JwtStrategy`: Passport JWT extraction and validation.
  * `JwtAuthGuard`: Reusable token protection guard.
  * `RolesGuard` & `@Roles(...)`: Role-based access control guard.
  * `@CurrentUser(...)`: Param decorator for injecting authenticated user claims into route handlers.
* **`OrganizationsModule`** (`backend/src/modules/organizations/`):
  * `OrganizationsService`: Organization directory querying, membership assignment, and claim request handling.
  * `OrganizationsController`: Endpoints for public organization discovery and authenticated claim submissions.

## Frontend

* **`frontend/src/lib/auth-context.tsx`**: React context (`AuthProvider`, `useAuth()`) managing token persistence in `localStorage`, user session state, login/register calls, and token destruction on logout.
* **`frontend/src/app/components/auth-card.tsx`**: Responsive authentication card featuring:
  * Login & Registration tabbed views.
  * Quick-fill development credentials for fast testing.
  * Live user session inspector showing decoded JWT payload and active memberships.
  * Live RBAC test trigger executing calls against `@Roles(PLATFORM_ADMIN)` endpoint.
  * Public organization search and claim submission interface.

## Backend

* **Dependencies**: `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcryptjs`.
* **Configuration**: Configurable JWT secret (`JWT_SECRET`) and expiration (`JWT_EXPIRES_IN`, default: `7d`).

## Database

* **Migration**: [`1710100000000-Phase3AuthAndMemberships.ts`](file:///d:/Projects/Crowdsource/backend/src/database/migrations/1710100000000-Phase3AuthAndMemberships.ts).
* **Tables Created**:
  * `organization_memberships`: M:N link between users and organizations with `organization_role` and `membership_status`.
  * `organization_claim_requests`: Audit trail of users requesting administrative control over an organization profile.
* **Tables Modified**:
  * `users`: Added `password_hash varchar(255)`.
* **Enums Added / Extended**:
  * `user_role_enum`: Added `INDUSTRY_ADMIN`, `INDUSTRY_MEMBER`, `GOVERNMENT_ADMIN`, `GOVERNMENT_OFFICER`.
  * `organization_role_enum`: `ADMIN`, `MEMBER`.
  * `membership_status_enum`: `PENDING`, `ACTIVE`, `INACTIVE`, `REVOKED`.
  * `claim_request_status_enum`: `PENDING`, `APPROVED`, `REJECTED`.

## AI/ML

* **Status in Phase 3**: Standby. AI Service was not integrated into authentication or access-control workflows.

## APIs

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user account (strictly defaults to `CITIZEN`) |
| `POST` | `/api/auth/login` | Public | Authenticate credentials and receive signed JWT access token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile with organization memberships |
| `GET` | `/api/auth/admin-test` | `PLATFORM_ADMIN` | Verification endpoint testing RBAC guard enforcement |
| `GET` | `/api/organizations` | Public | Search and list public organization profiles |
| `GET` | `/api/organizations/:id` | Public | Retrieve detailed profile for an organization |
| `GET` | `/api/organizations/:id/members`| Authenticated | List members affiliated with an organization |
| `POST` | `/api/organization-claims` | Authenticated | Submit an organization claim request (status: `PENDING`) |
| `GET` | `/api/organization-claims` | Authenticated | List submitted claims (users see own claims; admins see all) |

## Security / Validation

* **Password Hashing**: Irreversible bcrypt hashing with 10 salt rounds. Plaintext passwords never touch database storage.
* **Privilege Escalation Prevention**: `RegisterDto` strips role manipulation attempts; new accounts unconditionally receive `CITIZEN`.
* **Stateless JWTs**: Tokens verified cryptographically per request without database lookups on every route.
* **Decoupled Claim Architecture**: Submitting an organization claim grants **zero** permissions until verified by a platform administrator.

## Inputs

* `RegisterDto`: `name` (required, 2-100 chars), `email` (valid email), `password` (min 8 chars), `phone` (optional).
* `LoginDto`: `email`, `password`.
* `CreateClaimRequestDto`: `organization_id` (UUID), `reason` (text).

## Outputs

* JWT Access Token: `{ accessToken: "eyJhbGciOi..." }`.
* Authenticated User Profile (DTO strictly omitting `password_hash`).

## Current Implementation

* Fully implemented, migrated, and verified via `test/verify-auth.ts` (38 assertions) and `test/verify-http-api.ts` (27 assertions).

## Dependencies

* `bcryptjs`, `@types/bcryptjs`
* `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`
* TypeORM 0.3+

## Decisions Made

1. **Decoupling Platform Roles from Organization Roles**: A user's platform role (`CITIZEN`, `FACULTY`, etc.) is distinct from their organizational role (`ADMIN`, `MEMBER`). This allows faculty members to participate across multiple institutions without role conflict.
2. **Pre-existing Organization Profiles**: Universities and enterprises can exist as public profiles prior to being claimed by human representatives, matching real-world registry synchronization patterns (e.g., AISHE/NIRF).
3. **Stateless JWT vs Session**: Chose stateless JWTs for simplified horizontal scaling and consistency across Next.js frontend and potential future mobile clients.

## Future Enhancements

* Challenge creation and crowdsourcing workflow (implemented in Phase 4).
* Automated verification of claims via institutional email domains (.ac.in, .edu) and official document uploads.

## Status

**Completed**.
