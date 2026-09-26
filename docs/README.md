# ResolvIN — Project Documentation

ResolvIN is a technology-enabled societal innovation collaboration platform that connects real-world societal problems with institutions, innovators, industries, startups, MSMEs, CSR organizations, and government stakeholders.

## Project Phases

| Phase | Description | Status |
| :--- | :--- | :--- |
| **Phase 1** | **Platform Foundation**: Core multi-service developer setup, Docker infrastructure, dynamic health monitoring, Next.js 14, NestJS 10, Python FastAPI AI service baseline, and PostgreSQL with vector readiness. | Completed |
| **Phase 2** | **Database & Backend Foundation**: Complete relational database schema (23 entities), pure TypeORM migrations, academic/industry hierarchies, capability provenance, explainable AI containers, and collaborative projects. | Completed |
| **Phase 3** | **Authentication, Roles & Organization Membership**: Identity & access control, bcrypt hashing, stateless JWT authentication, reusable guards (`JwtAuthGuard`, `RolesGuard`), 9 granular platform roles, and decoupled organization memberships/claims. | Completed |
| **Phase 4** | **Challenge & Crowdsourcing Foundation**: Grassroots problem intake for citizens, controlled Jharkhand master location data (districts & blocks), local evidence storage with automated cleanup, post-submission immutability, community confirmations ("I experience this too"), and reviewer governance. | Completed |
| **Phase 5** | **AI Intelligence & Ecosystem Matching**: Provider-agnostic AI microservice (NVIDIA NIM & Mock), structured challenge problem extraction, taxonomy normalization, Capability Passport, versioned embeddings, staged candidate retrieval, hybrid scoring (HEI vs Industry), explainable recommendations, and human review triage governance. | Completed |
| **Phase 5.5A** | **Real Ecosystem Data Onboarding**: Self-serve Capability Passport for HEIs/Industries/Startups, trust state separation (UNVERIFIED vs CLAIMED vs VERIFIED), configurable availability TTL, master taxonomy governance with addition requests, evidence provenance, and explicitly recoverable PostgreSQL AI vector indexing without external queues. | Completed |
| **Phase 5.5B** | **Real Ecosystem Data Onboarding & Capability Passport**: Real Jharkhand HEI/Industry data ingestion, Scenario A & B onboarding workflows, role elevation, geographic reach (District/Statewide/National) in hybrid matching, evidence visibility governance, capability mutation invalidation, and deterministic AI vector indexing. | Completed |

## Documentation

* [Phase 1 — Platform Foundation](./phase-1.md)
* [Phase 2 — Database & Backend Foundation](./phase-2.md)
* [Phase 3 — Authentication, Roles & Organization Membership](./phase-3.md)
* [Phase 4 — Challenge & Crowdsourcing Foundation](./phase-4.md)
* [Phase 5 — AI Intelligence & Ecosystem Matching](./phase-5.md)
* [Phase 5.5A — Real Ecosystem Data Onboarding](./phase-5-5a.md)
* [Phase 5.5B — Real Ecosystem Data Onboarding & Capability Passport](./phase-5-5b.md)

## Current Development Status

The **ResolvIN** platform is fully implemented, audited, and verified through **Phase 5.5B**:
- **302 automated backend assertions** passing across 7 test suites via `npm test` (`run-all-tests.ts`).
- **21 automated authentication & role UX checks** passing via `test/test-auth-ux-flows.ts`.
- **19 AI service unit assertions** passing via `test_ai_service.py`.
- **Live NVIDIA NIM Integration**: `meta/llama-3.2-11b-vision-instruct` (LLM inference) and `nvidia/nemotron-3-embed-1b` (2048-dimensional embeddings).
- **Reranker Status**: Deterministic Fallback Reranking active (due to NVIDIA `/v1/ranking` returning HTTP 404 for NIM reranker models).
- **Phase 6 Boundaries**: Strictly preserved. No Expression of Interest, bilateral MoU, collaboration agreement, or funding workflows exist in the current codebase. Phase 6 will begin only after the upcoming visual/UI redesign baseline freeze.
