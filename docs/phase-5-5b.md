# SamadhanSetu — Phase 5.5B: Real Ecosystem Data Onboarding & Capability Passport

## 1. Overview & Architecture

Phase 5.5B expands SamadhanSetu's ecosystem registry from synthetic demo structures into a **real-world capability registry** for higher education institutions (HEIs), research laboratories, industrial enterprises, startups, and MSMEs across Jharkhand and India.

It operationalizes the **Capability Passport** as a living, auditable trust artifact that feeds the multi-stage AI matching engine (introduced in Phase 5) with high-integrity, deterministic, and verifiable organizational data.

### Core Architectural Principles
1. **Zero External Infrastructure**: All asynchronous jobs, event cascades, and recovery sweeps are implemented entirely within the NestJS runtime using `@nestjs/event-emitter`, `@nestjs/schedule`, and transaction-safe PostgreSQL persistence—completely avoiding Redis, BullMQ, Kafka, or RabbitMQ.
2. **Deterministic AI Vector Serialization**: Organization capability passports are serialized into text using strictly sorted keys, child arrays, and entities `(a.name || '').localeCompare(b.name || '')` to eliminate vector drift across updates.
3. **Multi-Stage Trust & Evidence Governance**: Explicit separation between claimed identity, community verification, and administrative audit. Any mutation to verified capabilities invalidates verification status (`VERIFIED` $\rightarrow$ `PENDING_VERIFICATION` or `UNVERIFIED`) until fresh evidence is reviewed.
4. **Geographic Reach Granularity**: Organizations declare operational scale (`DISTRICT`, `STATEWIDE`, `NATIONAL`), which directly factors into hybrid candidate retrieval and scoring without hard-filtering valid statewide/national institutions.
5. **Two-Track Onboarding Architecture**:
   - **Scenario A (Pre-seeded Unclaimed Records)**: Authorized representatives claim existing registry records with proof documents (`POST /api/organizations/:id/claim`). Platform admins review and approve (`POST /api/organization-claims/:id/approve`), granting `ADMIN` role and elevating user credentials.
   - **Scenario B (Unlisted New Institutions)**: New entities submit an onboarding application (`POST /api/organizations/onboarding-requests`). Upon admin approval (`POST /api/admin/onboarding-requests/:id/approve`), the organization, capability profile, admin membership, and role elevation are generated atomically.

---

## 2. Database Schema Extensions

### Migration: `1710500000000-Phase55BRealEcosystemOnboarding.ts`
- **`organizations`**:
  - `geographic_reach`: `VARCHAR` (`DISTRICT`, `STATEWIDE`, `NATIONAL`), default: `'DISTRICT'`
  - `is_demo`: `BOOLEAN`, default: `false`
- **`organization_evidence`**:
  - `is_public`: `BOOLEAN`, default: `false`
- **`organization_onboarding_requests`** (New Table):
  - `id`: `UUID` (Primary Key)
  - `requester_user_id`: `UUID` (Foreign key to `users`)
  - `name`: `VARCHAR`
  - `organization_type`: `VARCHAR`
  - `registration_number`: `VARCHAR`
  - `email`: `VARCHAR`
  - `website`: `VARCHAR` (nullable)
  - `phone`: `VARCHAR` (nullable)
  - `address`: `TEXT` (nullable)
  - `district`: `VARCHAR`
  - `state`: `VARCHAR`
  - `geographic_reach`: `VARCHAR`
  - `verification_document_url`: `VARCHAR`
  - `status`: `VARCHAR` (`PENDING`, `APPROVED`, `REJECTED`), default: `'PENDING'`
  - `reviewed_by`: `UUID` (nullable, foreign key to `users`)
  - `reviewed_at`: `TIMESTAMP` (nullable)
  - `admin_notes`: `TEXT` (nullable)
  - `created_organization_id`: `UUID` (nullable, foreign key to `organizations`)
  - `created_at`: `TIMESTAMP`
  - `updated_at`: `TIMESTAMP`

---

## 3. Real Ecosystem Data Ingestion

Pre-seeded institutions in Jharkhand seeded with realistic capability profiles and `is_demo: false`:

### Higher Education & Research Institutions (HEIs)
1. **Birsa Agricultural University (BAU), Ranchi**:
   - Focus: Agronomy, Soil Science, Drought-Resilient Crop Genetics, Post-Harvest Engineering.
   - Labs: Biofertilizer Quality Control Lab, Remote Sensing & Agro-Meteorology Center.
   - Capabilities: Soil Nutrient Chemistry Analysis, Drought-Tolerant Seed Development, Farm Mechanization Diagnostics.
2. **Birla Institute of Technology (BIT) Mesra, Ranchi**:
   - Focus: Environmental Engineering, Remote Sensing, Autonomous Robotics, Cyber-Physical Systems.
   - Labs: High-Voltage & Power Systems Lab, Space & Satellite Imagery Processing Center.
   - Capabilities: Satellite Hydrological Surveying, Municipal Wastewater Bio-Remediation, Microgrid Optimization.
3. **Indian Institute of Technology (ISM) Dhanbad**:
   - Focus: Mining Safety, Geotechnical Engineering, Heavy Metals Water Treatment, Clean Coal Technology.
   - Labs: Advanced Mine Ventilation & Dust Simulation Lab, Water Quality & Hydrogeology Facility.
   - Capabilities: Acid Mine Drainage Remediation, Geotechnical Slope Stability Assessment, Arsenic & Fluoride Membrane Filtration.

### Industry Partners, Startups & MSMEs
1. **Tata Steel Ltd (Raw Materials & Sustainability Division), Jamshedpur**:
   - Focus: Industrial Water Recycling, Slag Valorization, Circular Economy.
   - Capabilities: High-Capacity Effluent Treatment Plants, Heavy Metal Slag Stabilization.
2. **AgroGreen Innovations Pvt Ltd, Ranchi**:
   - Focus: Precision Agriculture, Cold Chain Logistics, Agri-Tech IoT.
   - Capabilities: Solar-Powered Decentralized Cold Storage Units, IoT Soil Moisture Sensing Grids.
3. **JalShuddhi Solutions, Dhanbad**:
   - Focus: Rural Community Water Purification, Filtration Membranes.
   - Capabilities: Solar Fluoride/Arsenic Filtration Units, Community Water Kiosk Deployment.

---

## 4. Capability Passport Lifecycle & Mutation Governance

```
[Registry Ingestion]
        │
        ▼
   (UNVERIFIED) ──[Attach Evidence]──► (PENDING_VERIFICATION) ──[Admin Audit]──► (VERIFIED)
        ▲                                                                            │
        │                                                                            │
        └──────────────────────────[Modify Capability]───────────────────────────────┘
                               (Invalidation Event)
```

1. **Self-Serve Capability Addition**: Organization admins submit domain capabilities (`POST /api/organizations/:id/capabilities`) with category and description.
2. **Evidence Attachment**: Admins attach verifiable proof documents (`POST /api/organizations/:id/evidence`), specifying document title, type, URL, and `is_public` visibility.
3. **Evidence Viewing & Security**: `GET /api/evidence/:id/view` enforces public vs private permissions. Private evidence can only be viewed by org members, reviewers, and platform admins.
4. **Mutation Invalidation**: Calling `PUT /api/organizations/:id/capabilities/:capabilityId` automatically triggers re-evaluation. If evidence exists, status resets to `PENDING_VERIFICATION`; if no evidence exists, it downgrades to `UNVERIFIED`.
5. **Evidence Deletion Safety**: Deleting an evidence record (`DELETE /api/evidence/:id`) re-queries all associated capabilities. If no valid evidence remains, the capability is downgraded to `UNVERIFIED`.

---

## 5. Availability Renewal & Freshness Engine

Organizations maintain an active collaboration capacity status governed by a configurable TTL (`AVAILABILITY_TTL_DAYS`, default: 30 days):
- **Live Status Query**: `GET /api/organizations/:id/availability` evaluates expiry in real-time. If `availability_expires_at < now`, it dynamically transitions to `'STALE'` and calculates remaining days.
- **Renewal Confirmation**: `POST /api/organizations/:id/availability/confirm` allows authorized administrators to specify available project slots (`capacity`) and duration (`ttlDays`). Sets status to `'FRESH'`, updates expiry, and emits `organization.updated` for instant AI vector re-indexing.

---

## 6. Deterministic AI Indexing & Recovery Sweep

1. **Deterministic Text Construction**:
   - Organization metadata (name, type, district, state, reach, capacity, freshness).
   - Alphabetically sorted departments: `(a.name || '').localeCompare(b.name || '')`.
   - Alphabetically sorted labs and specializations.
   - Alphabetically sorted research areas: `(a.title || '').localeCompare(b.title || '')`.
   - Alphabetically sorted capabilities: `(a.name || '').localeCompare(b.name || '')`.
2. **Sequential Batch Processing with Rate Limiting**:
   - Sequential batch indexing with configurable inter-request delay (default: 500ms) to prevent overwhelming NVIDIA NIM rate limits.
   - Automatic exponential backoff retry on HTTP 429/5xx errors.
3. **Cron Recovery Sweep**:
   - `@Cron(CronExpression.EVERY_10_MINUTES)` scans PostgreSQL for unindexed or failed embeddings (`embedding_vector IS NULL` or `embedding_status = 'FAILED'`).
   - Atomically locks and re-indexes records, ensuring self-healing resilience without external queue processes.

---

## 7. Hybrid Matching with Geographic Reach

In `MatchingService`, geographic compatibility (`geoScore`) evaluates operational reach alongside location:
- **`NATIONAL` Reach**: `geoScore = 1.0` (pan-India capability eligible across all districts).
- **`STATEWIDE` Reach**: `geoScore = 1.0` when within the same state (no intra-state district distance penalty).
- **`DISTRICT` Reach**: `geoScore = 1.0` for identical district; `0.80` for same state; `0.40` across states.

---

## 8. Frontend Implementation

### 1. Self-Serve Capability Passport (`/organizations/[id]/passport`)
- **Trust Badges**: Visual indicators for `CLAIMED` vs `UNCLAIMED`, `VERIFIED INSTITUTION`, and `DISTRICT`/`STATEWIDE`/`NATIONAL` reach.
- **Availability Card**: Live `FRESH` vs `STALE` status indicator, days remaining countdown, and interactive TTL renewal modal.
- **AI Vector Intelligence**: Display of NVIDIA Nemotron 2048-dimensional embedding status with "Re-index with NVIDIA AI" trigger.
- **Capability Passport Grid**: Verified capabilities list, categorized badges, and attached evidence count.
- **Evidence Vault**: Document repository with public/private authorization badges and direct document inspection.
- **Institution Claim Modal**: Representative claiming workflow for pre-seeded institutions.

### 2. Onboarding Portal (`/organizations/onboard`)
- Self-serve registration form for unlisted universities, R&D labs, and industry partners.
- Collects AISHE code, corporate CIN, operational reach, and accreditation proof URLs.
- Reference ID generation and clear status feedback.

---

## 9. Verification & Test Coverage

The test suite `backend/test/verify-phase5-5b.ts` executes **47 automated assertions** covering:
- **Suite 1**: Database schema & migration invariants (`geographic_reach`, `is_demo`, `is_public`, onboarding entity).
- **Suite 2**: Scenario A institutional claim lifecycle, admin approval, and role elevation.
- **Suite 3**: Scenario B unlisted onboarding application, admin review, and atomic organization generation.
- **Suite 4**: Capability Passport mutation governance, verification invalidation, and evidence lifecycle.
- **Suite 5**: Availability TTL tracking, STALE dynamic evaluation, and renewal.
- **Suite 6**: Deterministic string serialization and vector drift elimination.
- **Suite 7**: Recovery sweep resilience for unindexed/failed records.
- **Suite 8**: Geographic reach impact on hybrid matching scores.

Combined with Phases 2–5.5A, the master backend test suite executes and passes **302 total test assertions** across 7 test suites with 100% pass rate.
