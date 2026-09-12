# Phase 4 — Challenge & Crowdsourcing Foundation

## Objective

Allow authenticated citizens and community members to easily report real-world societal problems, turning simple grassroots input into structured, geographically validated, and verifiable challenges ready for future institutional matching, without requiring citizens to understand technical terminology.

## Problem Being Solved

Before Phase 4, the platform possessed rich relational models and authentication but lacked the core intake mechanism for real-world societal challenges. Furthermore:
1. Conventional complaint portals overwhelm citizens with lengthy, bureaucratic forms.
2. Unstandardized location input (free text) corrupts geographic clustering, analytics, and institutional matching.
3. Unregulated file uploads risk disk exhaustion and path-traversal attacks, while abandoned drafts leave orphaned files accumulating indefinitely.
4. Without strict immutability, submitters could alter problem statements while under administrative review.
5. Without anti-self-confirmation rules, metrics could be artificially inflated by challenge authors.

## Actors / Users Involved

* **`CITIZEN`**: Reports problems through a simple 4-step wizard, optionally uploads photos/videos/documents, manages personal drafts, and confirms shared community problems.
* **`GOVERNMENT_OFFICER`**: Authorized reviewer inspecting pending submissions, assessing regional credibility, and transitioning challenges to `UNDER_REVIEW`, `VALIDATED`, or `REJECTED`.
* **`PLATFORM_ADMIN`**: System superuser with full review, validation, and administrative draft cleanup authority.
* **`FACULTY` / `STUDENT` / `INDUSTRY_MEMBER`**: Can browse public validated challenges and confirm community issues, but are strictly forbidden from validating or rejecting challenges.

## Functional Requirements

* **Zero AI Implementation**: In strict compliance with Phase 4 boundaries, zero AI, LLM, embedding, or semantic deduplication models were implemented. `challenge_ai_analysis` remains a reserved future foundation.
* **Core UX Principle**: "Ask citizens only what they naturally know. Let the platform structure and analyze the information later."
* **Controlled Master Location Data**:
  * District and Block are controlled master data. Block selection is dynamically dependent on the selected District.
  * Village, tola, or locality is free-text.
  * Seeded with all 24 Jharkhand districts and primary administrative blocks.
  * Optional GPS coordinate capture via browser `navigator.geolocation`.
* **Challenge Lifecycle & Immutability**:
  * Lifecycle: `DRAFT` ➔ `SUBMITTED` ➔ `UNDER_REVIEW` ➔ `VALIDATED` or `REJECTED` (Optional: `ARCHIVED`).
  * **Critical Immutability Rule**: Only `DRAFT` challenges can be edited. Once `SUBMITTED`, the challenge content and attached evidence become strictly immutable for the citizen.
  * `PATCH /api/challenges/:id`: Strictly updates draft content; rejects attempts to mutate `status`.
  * `POST /api/challenges/:id/submit`: The only endpoint executing `DRAFT` ➔ `SUBMITTED`. Enforces mandatory title, description, district, and block before submission.
  * Daily rate limiting: Maximum 5 submitted challenges per user per 24 hours.
* **Evidence Storage & Protection**:
  * Stored on the local filesystem outside the database (`backend/uploads/evidence/`).
  * Strict MIME type whitelist: JPEG, PNG, WEBP, MP4, QuickTime, WebM, PDF, TXT.
  * Maximum file size limit: 15 MB.
  * Safe randomized UUID filenames (`randomUUID() + ext`); prevents path traversal.
  * Safe file streaming endpoint (`GET /api/challenges/evidence/file/:filename`).
* **Orphaned Evidence Cleanup**:
  * Explicit draft deletion deletes both database evidence records and physical files on disk.
  * Scheduled `DraftCleanupService` automatically purges abandoned drafts older than 72 hours (configurable) and removes their physical evidence files.
* **Community Confirmations ("I experience this problem too")**:
  * Measures genuine collective prevalence rather than generic social upvoting.
  * Enforces `UNIQUE(challenge_id, user_id)`.
  * Anti-self-confirmation: Authors cannot confirm their own challenges.
* **Reviewer Governance**:
  * Strictly restricted to `PLATFORM_ADMIN` and `GOVERNMENT_OFFICER` via `RolesGuard`.
  * Valid state transitions enforced; rejections require a mandatory reason string.
* **Public Discovery & Privacy**:
  * Public directory strictly excludes `DRAFT` challenges.
  * Citizen contact information (email, phone) is never exposed publicly; submitter is displayed as "Community Member".

## System Flow

```text
CITIZEN (Authenticated)
   │
   ▼
Step 1: The Problem (Title, simple description, optional severity) ──► Saves DRAFT
   │
   ▼
Step 2: Location (GPS assist, Jharkhand District dropdown, Block dropdown, Village)
   │
   ▼
Step 3: Optional Evidence (Upload JPEG/PNG/PDF/MP4 <= 15MB or Skip)
   │
   ▼
Step 4: Review & Submit (Immutability warning displayed)
   │
   ▼
POST /api/challenges/:id/submit ──► Status: SUBMITTED (Content locked)
   │
   ▼
Reviewer Queue (PLATFORM_ADMIN / GOVERNMENT_OFFICER)
   │
   ├─── Mark Under Review ──► Status: UNDER_REVIEW
   │                               │
   ├─── Validate Challenge ────────┼──► Status: VALIDATED (Public Discovery)
   │                               │       │
   └─── Reject (Mandatory Reason) ─┘       ▼
                                   Community Members Confirm
                                   ("I experience this problem too")
```

## Modules

* **`LocationsModule`** (`backend/src/modules/locations/`):
  * `LocationsService`: Retrieves sorted Jharkhand districts and dependent blocks.
  * `LocationsController`: Exposes `/api/locations/districts` and `/api/locations/districts/:districtId/blocks`.
* **`ChallengesModule`** (`backend/src/modules/challenges/`):
  * `ChallengesService`: Complete challenge business logic, rate limiting, immutability checks, confirmations, and reviewer transitions.
  * `ChallengesController`: REST endpoints with `JwtAuthGuard` and `RolesGuard`.
  * `EvidenceService`: File upload handling, MIME validation, safe storage, and file streaming.
  * `DraftCleanupService`: Scheduled and explicit physical file deletion for abandoned/deleted drafts.
  * DTOs: `CreateChallengeDto`, `UpdateChallengeDto`, `ReviewChallengeDto`, `QueryChallengesDto`.

## Frontend

* **`frontend/src/app/components/navbar.tsx`**: Responsive navigation bar with RBAC-aware links.
* **`frontend/src/app/challenges/page.tsx`**: Public Challenge Discovery page with keyword search, district filter, status tabs, challenge cards, and instant confirmation actions.
* **`frontend/src/app/challenges/new/page.tsx`**: 4-step mobile-first submission wizard with draft saving, GPS location assistance, optional evidence upload, and review confirmation.
* **`frontend/src/app/challenges/[id]/page.tsx`**: Challenge detail page with full description, standardized location badge, evidence gallery/viewer, submitter privacy attribution, and interactive confirmation toggle.
* **`frontend/src/app/my-challenges/page.tsx`**: Citizen dashboard with tabs (Drafts, Submitted, Under Review, Validated, Rejected) and draft resume/delete actions.
* **`frontend/src/app/reviewer-queue/page.tsx`**: Protected Reviewer Queue for `PLATFORM_ADMIN` and `GOVERNMENT_OFFICER` to inspect submissions and validate/reject with mandatory reasons.

## Backend

* **Dependencies**: `@nestjs/platform-express` (Multer), `@nestjs/typeorm`, `@nestjs/jwt`, TypeORM 0.3.
* **Configuration**: `UPLOADS_DIR`, `MAX_EVIDENCE_FILE_SIZE_BYTES` (15MB), `MAX_DAILY_CHALLENGE_SUBMISSIONS` (5), `DRAFT_CLEANUP_RETENTION_HOURS` (72h).

## Database

* **Migration**: [`1710200000000-Phase4ChallengesAndCrowdsourcing.ts`](file:///d:/Projects/Crowdsource/backend/src/database/migrations/1710200000000-Phase4ChallengesAndCrowdsourcing.ts).
* **Tables Created**:
  * `districts`: `id`, `name` (UNIQUE), `state` ('Jharkhand'), `code`.
  * `blocks`: `id`, `district_id` (FK), `name`, `code`, with `UNIQUE(district_id, name)`.
  * `challenge_confirmations`: `id`, `challenge_id` (FK), `user_id` (FK), `created_at`, with `UNIQUE(challenge_id, user_id)`.
* **Tables Modified**:
  * `challenges`: Added `district_id` (FK), `block_id` (FK), `village_locality`, `citizen_severity`, `affected_population`, `submitted_at`, `validated_at`, `rejection_reason`. Altered `district` and `state` to be nullable; default `status` set to `'DRAFT'`.
  * `challenge_evidence`: Added `uploaded_by` (FK to `users`).
* **Enums Added / Extended**:
  * `challenge_status_enum`: Added `DRAFT` and `ARCHIVED`.
  * `citizen_severity_enum`: `NOT_SURE`, `MODERATE`, `SERIOUS`.
* **Master Data Seeded**: All 24 Jharkhand districts and primary administrative blocks.

## AI/ML

* **Status in Phase 4**: Strictly zero AI implementation. No LLM integration, embeddings, semantic deduplication, or vector search were introduced. `challenge_ai_analysis` remains reserved for future phases.

## APIs

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/locations/districts` | Public | List all 24 Jharkhand districts |
| `GET` | `/api/locations/districts/:id/blocks` | Public | List blocks dependent on selected district |
| `POST` | `/api/challenges` | Authenticated | Create a new challenge draft |
| `GET` | `/api/challenges` | Public | Discover public challenges (excludes drafts) |
| `GET` | `/api/challenges/my` | Authenticated | List current user's challenges & drafts |
| `GET` | `/api/challenges/review/queue` | Reviewer | Retrieve reviewer queue (Gov / Admin only) |
| `GET` | `/api/challenges/:id` | Public / Owner | Retrieve challenge detail (drafts private to creator) |
| `PATCH` | `/api/challenges/:id` | Owner | Update draft content (strictly blocked after submission) |
| `DELETE` | `/api/challenges/:id` | Owner / Admin | Delete draft & permanently remove physical evidence files |
| `POST` | `/api/challenges/:id/submit` | Owner | Submit draft (locks challenge, enforces daily rate limit) |
| `POST` | `/api/challenges/:id/confirm` | Authenticated | Confirm problem ("I experience this too"; rejects self-confirmation) |
| `DELETE` | `/api/challenges/:id/confirm` | Authenticated | Remove community confirmation |
| `POST` | `/api/challenges/:id/review` | Reviewer | Transition challenge (`UNDER_REVIEW`, `VALIDATED`, `REJECTED`) |
| `POST` | `/api/challenges/:id/evidence` | Owner | Upload evidence to draft (multipart, <=15MB, MIME checked) |
| `DELETE` | `/api/challenges/:id/evidence/:evidenceId` | Owner | Remove evidence item & delete physical file |
| `GET` | `/api/challenges/evidence/file/:filename` | Public | Safely stream evidence file with path traversal protection |

## Security / Validation

* **Post-Submission Immutability**: Challenges cannot be mutated via `PATCH` or receive new evidence once submitted.
* **Workflow Integrity**: Status transitions can only be triggered via dedicated endpoints (`/submit` and `/review`).
* **Anti-Self-Confirmation**: Enforced check rejects authors confirming their own issues (`403 Forbidden`).
* **Daily Submission Ceiling**: Prevents spam by capping submissions at 5 per user per 24 hours (`429 Too Many Requests`).
* **File Upload Protections**: Whitelisted MIME types, 15MB limit, sanitized UUID filenames, and directory boundary enforcement.
* **Draft Privacy**: Drafts are hidden from public queries (`404 Not Found`).
* **Citizen Privacy**: Submitter contact details are masked as "Community Member" in public directories.

## Inputs

* `CreateChallengeDto`: `title` (5-300 chars), `description` (10-5000 chars), `district_id`, `block_id`, `village_locality`, `citizen_severity`, `affected_population`, `latitude`, `longitude`.
* `UpdateChallengeDto`: Optional fields excluding `status`.
* `ReviewChallengeDto`: `status` (`UNDER_REVIEW`, `VALIDATED`, `REJECTED`), `reason` (mandatory if rejected).
* Multipart file uploads for evidence attachments.

## Outputs

* Structured, standardized challenge records with normalized district and block associations.
* Community confirmation counts.
* Safe streaming evidence URLs (`/api/challenges/evidence/file/...`).
* Review audit timestamps (`submitted_at`, `validated_at`, `rejection_reason`).

## Current Implementation

* Fully implemented, migrated, and verified via `test/verify-phase4.ts` (61 assertions, 100% pass) and `npm test` (145 total assertions across all phases).

## Dependencies

* NestJS, Multer, TypeORM 0.3+
* PostgreSQL 16
* Next.js 14, React 18, Tailwind CSS, Lucide icons

## Decisions Made

1. **Controlled Master Location Data**: Disallowed free-text district and block input to prevent data corruption and ensure future AI clustering and institutional matching algorithms have clean regional anchors.
2. **Post-Submission Immutability**: Locked challenge content upon submission to protect the integrity of government reviews.
3. **Prohibition of Self-Confirmation**: Prohibited authors from confirming their own problems to ensure community validation reflects authentic collective need.
4. **Local Filesystem Evidence Storage**: Chosen for rapid prototype development with automatic orphaned file cleanup, avoiding early cloud storage costs while maintaining a clean abstraction.

## Future Enhancements

* **Phase 5**: AI-assisted problem classification, semantic deduplication, and research capability matching.

## Status

**Completed**.
