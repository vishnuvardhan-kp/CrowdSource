# Phase 5.5A — Real Ecosystem Data Onboarding

## 1. Overview

**Phase 5.5A: Real Ecosystem Data Onboarding** establishes a self-serve **Capability Passport** backend and database architecture for Higher Education Institutions (HEIs), Industries, Startups, and MSMEs across India.

It enforces strict trust separation, dynamic availability TTL freshness, authoritative master taxonomy governance with administrative request workflows, documentary evidence provenance, and explicitly recoverable PostgreSQL-backed asynchronous AI vector indexing without external queue dependencies (no Redis, BullMQ, RabbitMQ, Kafka).

---

## 2. Core Architectural Principles

### A. Trust State Model
The platform separates organizational claims from verified capabilities:
* **`UNVERIFIED`**: Initial public/admin shell created for an organization.
* **`CLAIMED`**: Authorized representative claimed profile identity via Phase 3 claim workflow.
  * **Strict Invariant**: Claiming identity does **NOT** automatically verify capabilities or make availability fresh.
* **`VERIFIED`**: Specific capability claim or documentary evidence reviewed and approved by an authorized reviewer with an immutable audit record in `VerificationRecord`.

### B. Configurable Availability TTL
* **Environment Variable**: `AVAILABILITY_TTL_DAYS=30` (configurable via NestJS `ConfigService`).
* **Formula**: $\text{expires\_at} = \text{confirmed\_at} + (\text{AVAILABILITY\_TTL\_DAYS} \times 86400000\text{ ms})$.
* **Evaluation**: Evaluates dynamically to `FRESH` (active TTL), `STALE` (expired TTL), or `UNKNOWN` (unconfirmed).

### C. Master Taxonomy Governance
* Organizations select capabilities from the authoritative master `capabilities` taxonomy.
* **Missing Capability Workflow**: When an organization possesses a specialized capability not found in the taxonomy:
  1. Organization representative submits `TaxonomyAdditionRequest` (`status: PENDING`).
  2. **Strict Invariant**: `PENDING` requests cannot enter master taxonomy and cannot participate in exact capability matching.
  3. Platform Administrator reviews proposal via `/api/admin/taxonomy-requests`.
  4. On approval, a new capability is inserted into `capabilities` and the request is marked `APPROVED`.

### D. Evidence Provenance
* `OrganizationEvidence` captures documentary proof (accreditations, lab calibration certificates, ISO badges, patents).
* Links to either:
  * General organization-level proof (capability FKs are `null`).
  * Specific capability claim via `institution_capability_id` or `industry_capability_id`.
* Verification decisions log immutable audit records in `VerificationRecord`.

### E. Explicitly Recoverable PostgreSQL AI Indexing
* **No External Queues**: Uses `@nestjs/event-emitter` for immediate execution paired with `@nestjs/schedule` (`@Cron('*/5 * * * *')`) background recovery.
* **Database as Single Source of Truth**:
  * `EntityEmbedding` tracks `indexing_status` (`PENDING`, `PROCESSING`, `ACTIVE`, `FAILED`), `indexing_requested_at`, `last_indexed_at`, `indexing_attempts`, and `last_indexing_error`.
  * Deterministic canonical source text and SHA-256 hash generation.
  * Recovers and retries pending or failed indexing jobs across server restarts with zero lost work.

---

## 3. Database Schema Extensions

### Migration: `1710400000000-Phase55AEcosystemOnboarding.ts`
* **Risk Classification**: Low-risk additive migration with no intentional destructive changes.

#### 1. `taxonomy_addition_requests` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Auto-generated UUID |
| `organization_id` | UUID | FK $\rightarrow$ `organizations(id)` ON DELETE CASCADE | Target organization |
| `submitted_by` | UUID | FK $\rightarrow$ `users(id)` ON DELETE RESTRICT | Representative user |
| `proposed_name` | VARCHAR(150) | NOT NULL | Proposed capability name |
| `proposed_category` | VARCHAR(100) | NOT NULL, DEFAULT 'General' | Proposed domain |
| `reason` | TEXT | NOT NULL | Justification for addition |
| `status` | `review_status_enum` | NOT NULL, DEFAULT 'PENDING' | `PENDING`, `APPROVED`, `REJECTED` |
| `reviewed_by` | UUID | FK $\rightarrow$ `users(id)` ON DELETE SET NULL | Reviewer user |
| `reviewed_at` | TIMESTAMPTZ | NULL | Timestamp of decision |
| `admin_notes` | TEXT | NULL | Reviewer audit notes |

#### 2. `organization_evidence` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | Auto-generated UUID |
| `organization_id` | UUID | FK $\rightarrow$ `organizations(id)` ON DELETE CASCADE | Target organization |
| `institution_capability_id` | UUID | FK $\rightarrow$ `institution_capabilities(id)` ON DELETE SET NULL | HEI capability claim link |
| `industry_capability_id` | UUID | FK $\rightarrow$ `industry_capabilities(id)` ON DELETE SET NULL | Industry capability claim link |
| `capability_id` | UUID | FK $\rightarrow$ `capabilities(id)` ON DELETE SET NULL | Master taxonomy link |
| `uploaded_by` | UUID | FK $\rightarrow$ `users(id)` ON DELETE SET NULL | Submitter user |
| `evidence_type` | `evidence_type_enum` | NOT NULL, DEFAULT 'DOCUMENT' | Document, photo, certificate, link |
| `title` | VARCHAR(255) | NOT NULL | Title of evidence |
| `description` | TEXT | NULL | Description |
| `url` | VARCHAR(1000) | NOT NULL | Document URL / path |
| `mime_type` | VARCHAR(100) | NULL | MIME type |
| `verification_status` | `verification_status_enum`| NOT NULL, DEFAULT 'UNVERIFIED' | Verification state |
| `verified_by` | UUID | FK $\rightarrow$ `users(id)` ON DELETE SET NULL | Reviewer |
| `verified_at` | TIMESTAMPTZ | NULL | Verification timestamp |
| `verification_notes` | TEXT | NULL | Reviewer notes |

#### 3. `entity_embeddings` Table Extensions
* `indexing_status`: `indexing_status_enum` (`PENDING`, `PROCESSING`, `ACTIVE`, `FAILED`) NOT NULL DEFAULT 'ACTIVE'.
* `indexing_requested_at`: `timestamptz`.
* `last_indexed_at`: `timestamptz`.
* `indexing_attempts`: `int` NOT NULL DEFAULT 0.
* `last_indexing_error`: `text`.

---

## 4. API Endpoints

### Organization & Passport
* `GET /api/organizations/:id/passport`: Full polymorphic Capability Passport.
* `PUT /api/organizations/:id/passport`: Atomic self-serve update of organization metadata and sub-profiles.
* `POST /api/organizations/:id/capabilities`: Attaches a master taxonomy capability in `UNVERIFIED` trust state.
* `DELETE /api/organizations/:id/capabilities/:capabilityId`: Detaches a capability claim.
* `POST /api/organizations/:id/evidence`: Uploads documentary evidence with optional capability linkage.
* `GET /api/organizations/:id/evidence`: Lists organization evidence.
* `DELETE /api/organizations/:id/evidence/:evidenceId`: Deletes unverified evidence.

### Availability
* `GET /api/organizations/:id/availability`: Retrieves current capacity, expiration date, and freshness.
* `PUT /api/organizations/:id/availability`: Confirms active availability, renewing TTL to now + `AVAILABILITY_TTL_DAYS`.

### Taxonomy Governance
* `POST /api/organizations/:id/taxonomy-requests`: Representative proposes missing capability.
* `GET /api/organizations/:id/taxonomy-requests`: Lists submitted requests for that organization.
* `GET /api/admin/taxonomy-requests`: Platform Admin queue of pending requests.
* `POST /api/admin/taxonomy-requests/:id/approve`: Admin approves proposal into master taxonomy.
* `POST /api/admin/taxonomy-requests/:id/reject`: Admin rejects proposal with reason.

### Universal Verification Queue
* `GET /api/admin/verification/queue`: Reviewer queue of pending evidence, capabilities, and claims.
* `POST /api/admin/verification/:id/approve`: Approves claim item $\rightarrow$ sets `VERIFIED` + logs `VerificationRecord`.
* `POST /api/admin/verification/:id/reject`: Rejects claim item with mandatory notes.

---

## 5. Verification & Test Suite

The automated test suite (`backend/test/verify-phase5-5a.ts`) validates all 36 assertions across 6 test suites:
1. **Capability Passport Creation & Authorization**: Polymorphic passport retrieval, updates, and 403 Forbidden enforcement.
2. **Trust Model Invariants**: `UNVERIFIED` $\rightarrow$ `CLAIMED`, proving claiming does not auto-verify capabilities.
3. **Master Taxonomy Governance**: Master taxonomy attachment, arbitrary capability rejection, `PENDING` request matching isolation, admin approval/rejection workflows.
4. **Evidence Provenance & Verification**: Capability claim linking, reviewer queue, verification approval/rejection with `VerificationRecord`.
5. **Configurable Availability TTL**: Configurable 30-day freshness, TTL expiration evaluation.
6. **Explicitly Recoverable AI Indexing**: Canonical text generation, SHA-256 hashing, 2048-dim vectors, scheduled recovery sweep recovering failed jobs from PostgreSQL.
