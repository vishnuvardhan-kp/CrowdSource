# ResolvIN — System Architecture

This document provides a concise architectural overview of the ResolvIN multi-stakeholder innovation pipeline.

---

## 1. End-to-End Conceptual Flow

```text
[ Citizen Intake ]
       │
       ▼
[ AI Problem Intelligence ]
   - Problem Structuring & Zero-Fabrication Fact Extraction
   - Categorization (18 Municipal Domains) & Urgency Scoring
   - Semantic Deduplication & Community Signal Clustering
       │
       ▼
[ University Capability Matching ]
   - NABL Lab Facilities, Faculty Expertise & Institutional Mandate
   - Top Recommendations with Multi-Factor Explainability Rationale
       │
       ▼
[ Proposed Solution Workspace ]
   - Non-Confidential Executive Summary (Public Discovery)
   - Masked Technical Blueprint (Confidential IP Protection)
       │
       ▼
[ Multi-Stakeholder Collaboration ]
   - Industry, MSME, Startup & CSR Offers (Financial & Technical)
   - Multidisciplinary Academic Team (Faculty Mentors + Student Researchers)
   - Consortium Formation & Blueprint Unmasking
       │
       ▼
[ Project Lifecycle Execution ]
   - Stages: Planning → Prototype → Testing → Pilot → Deployment → Completion
   - Phased Milestones with Overdue Alerts & Approval Gates
   - Project Deliverables Vault & Blocker Resolution
       │
       ▼
[ Social Impact & Innovation Outcomes ]
   - Verified Beneficiary Reach & Categorical Metrics
   - NABL Laboratory Certificates & Photo Evidence Audit
   - Indian Patent Office Filings, Startup Spin-Offs & Tech Transfer
       │
       ▼
[ Government Administrative Oversight ]
   - Authentic 24-District Jharkhand GIS Heatmap (EPSG:4326 Survey Geometry)
   - Cross-District Comparative Matrix & Sectoral Velocity Timelines
   - Zero-Fabrication Telemetry & Audit Logs
```

---

## 2. Component Architecture

### A. Web & Mobile Frontend Layer
- **Next.js 14 Web Portal:** Server and client components rendering responsive portals for Citizens, Universities, Reviewers, and Government Officials.
- **Expo SDK 57 Mobile App:** Native Android and iOS citizen reporting client with offline draft persistence and camera integration.
- **GIS Cartography:** Vector SVG renderer projecting true EPSG:4326 district boundary paths (4,494 Douglas-Peucker vertices) with Green's Theorem centroid label placement.

### B. Backend API Gateway Layer (NestJS 10)
- **Authentication & RBAC:** Stateless JWT tokens, bcrypt credential verification, role-based guard enforcement (`RolesGuard`).
- **Jurisdiction Scoping (`resolveJurisdictionScope`):** Enforces strict data-access boundaries. District Officers are locked to their assigned district ID, preventing cross-district horizontal privilege escalation (IDOR).
- **Domain Modules:** Independent modules managing challenges, solutions, academic rosters, collaborations, project lifecycles, blockers, outcomes, and impact assessments.

### C. AI / ML Microservice Layer (FastAPI)
- **Inference Integration:** Provider-agnostic interface supporting external cloud inference via NVIDIA NIM (`meta/llama-3.2-11b-vision-instruct`), Sarvam multilingual speech-to-text, and local deterministic mock providers.
- **Three-Tier Data Separation:**
  1. *Immutable Tier:* Citizen verbatim input and audio recordings.
  2. *Refinement Tier:* Formal civic titles and problem statements synthesized by AI.
  3. *Zero-Fabrication Tier:* Citizen facts extracted exclusively from citizen utterances, cleanly isolated from platform administrative metadata.
- **Offline Fallback Engine:** Automatic failover to internal deterministic rule engines if external AI APIs are unreachable.

### D. Data & Persistence Layer (PostgreSQL 16)
- **Relational Schema:** Normalized entities with foreign keys, cascading rules, and UUID primary keys.
- **LGD Master Data:** Authoritative Local Government Directory (LGD) tables mapping all 24 Jharkhand districts, administrative blocks, and urban local bodies.
- **Zero-Fabrication Telemetry:** Dashboard KPIs derived from database queries over real tables with documented calculation formulas.
