# Phase 2 — Database & Backend Foundation

## Objective

Design, implement, and verify the comprehensive relational database schema and TypeORM entity architecture for **SamadhanSetu**, establishing the complete domain blueprint for Higher Education Institutions (HEIs), Industry partners, research capabilities, provenance tracking, challenges, explainable AI recommendation containers, and collaborative innovation projects.

## Problem Being Solved

Societal innovation platforms often fail because they treat challenges as simple isolated helpdesk tickets without modeling the structural complexity of institutional solvers. To match problems with real academic research labs and industrial resources, the system required a normalized, relational data architecture capable of representing academic hierarchies (departments, faculty, laboratories, specialized equipment), industry support channels (funding, prototyping, testing), verifiable capability provenance, and human-in-the-loop review mechanisms.

## Actors / Users Involved

* **Platform Architects & Engineers**: Establish relational models, run migrations, and maintain schema integrity.
* **Domain Model Entities Represented**:
  * Higher Education Institutions (Administrators, Faculty Researchers, Students)
  * Industry Partners & MSMEs (Technical Mentors, Corporate Admins)
  * Citizens & Grassroots Communities (Problem Submitters)
  * Government Stakeholders (Policy & Impact Evaluators)

## Functional Requirements

* **Relational Schema Design**: Model 23 core entities representing the multi-stakeholder ecosystem.
* **Migration-Based Evolution**: Implement pure TypeORM migrations (`1710000000000-InitialDatabaseSchema.ts`) with `synchronize: false` strictly enforced.
* **Institutional Hierarchy Modeling**:
  * `Organization` ➔ `InstitutionProfile` ➔ `Department` ➔ `FacultyMember` ➔ `ResearchArea` / `Laboratory` / `Facility` ➔ `InstitutionCapability`.
* **Industrial Support Modeling**:
  * `Organization` ➔ `IndustryProfile` ➔ `IndustrySector` / `IndustrySupportType` ➔ `IndustryCapability`.
* **Capability Provenance & Trust**:
  * Reusable `VerificationRecord` model tracking evidence, verification sources (`OFFICIAL_WEBSITE`, `PUBLIC_DATA`, `PARTNER_VERIFIED`), and confidence scores.
* **Explainable AI Containers**:
  * `ChallengeAiAnalysis` container for future categorization and embeddings.
  * `RecommendationReview` container storing human explainability reasons (`ai_match_reasons` JSONB) and review decisions.
* **Project & Impact Lifecycle**:
  * Structured `Project` entity linked to adopted challenges, lead institutions, partner industries, and measurable `ProjectImpact`.

## System Flow

```text
Database Definition (TypeORM Entities in src/database/entities.ts)
                          │
                          ▼
TypeORM Migration (1710000000000-InitialDatabaseSchema.ts)
                          │
                          ▼
PostgreSQL 16 Engine Execution (Table Creation, Foreign Keys, Indexes)
                          │
                          ▼
Relational Data Architecture:
┌──────────────────┐    ┌─────────────────────────┐    ┌──────────────────────┐
│  Organizations   │───►│  Institution Profiles   │───►│ Departments & Labs   │
└────────┬─────────┘    └─────────────────────────┘    └──────────────────────┘
         │
         │              ┌─────────────────────────┐    ┌──────────────────────┐
         ├─────────────►│    Industry Profiles    │───►│ Sectors & Support    │
         │              └─────────────────────────┘    └──────────────────────┘
         │
         │              ┌─────────────────────────┐    ┌──────────────────────┐
         └─────────────►│       Challenges        │───►│ Evidence & Projects  │
                        └────────────┬────────────┘    └──────────────────────┘
                                     │
                                     ▼
                        ┌─────────────────────────┐
                        │ AI Analysis & Reviews   │ (Containers for Future Phases)
                        └─────────────────────────┘
```

## Modules

The backend modular monolith structure was organized into domain-specific modules:

* **`OrganizationsModule`** (`backend/src/modules/organizations/`): Core organization entity management.
* **`CapabilitiesModule`** (`backend/src/modules/capabilities/`): Standardized capability taxonomy.
* **`InstitutionsModule`** (`backend/src/modules/institutions/`): University profiles, departments, faculty members, labs, and research areas.
* **`IndustriesModule`** (`backend/src/modules/industries/`): Corporate profiles, sectors, and support types.
* **`VerificationModule`** (`backend/src/modules/verification/`): Reusable entity verification and provenance tracking.
* **`ChallengesModule`** (`backend/src/modules/challenges/`): Baseline challenge and evidence entities.
* **`AiAnalysisModule`** (`backend/src/modules/ai-analysis/`): Challenge AI analysis entity container.
* **`ReviewsModule`** (`backend/src/modules/reviews/`): Human explainability and recommendation review entities.
* **`ProjectsModule`** (`backend/src/modules/projects/`): Collaborative innovation project entities.
* **`ImpactModule`** (`backend/src/modules/impact/`): Project impact assessment entities.
* **`UsersModule`** (`backend/src/modules/users/`): Core user entity baseline.

## Database

### Tables Established (Initial 23 Tables)

1. `organizations`: Core organization record (universities, companies, NGOs, government).
2. `users`: Core platform users.
3. `capabilities`: Global taxonomy of academic and technical capabilities.
4. `institution_profiles`: Academic accreditation, established year, and campus metadata.
5. `departments`: Academic faculties/departments within an institution.
6. `faculty_members`: Researchers, professors, and specialized investigators.
7. `research_areas`: Academic focus areas and research themes.
8. `laboratories`: Specific research labs and equipment inventories.
9. `facilities`: Specialized institutional infrastructure (wind tunnels, clean rooms, etc.).
10. `institution_capabilities`: M:N link linking institutions, capabilities, confidence, and sources.
11. `industry_profiles`: Corporate registration, headquarters, and industry vertical metadata.
12. `industry_sectors`: Standardized economic/industrial sector taxonomy.
13. `industry_support_types`: Support categories (funding, mentorship, prototyping, hardware).
14. `industry_capabilities`: M:N link between industry profiles and capabilities.
15. `verification_records`: Audit trail verifying claims, capabilities, and profile legitimacy.
16. `challenges`: Societal problem statements with geographic coordinates and status.
17. `challenge_evidence`: Multimodal media metadata (photos, documents, URLs) attached to challenges.
18. `challenge_ai_analysis`: Pre-structured container for AI triage, duplicates, and embeddings.
19. `recommendation_reviews`: Human review tracking AI matching reasons and approvals.
20. `projects`: Tripartite collaborative projects addressing validated challenges.
21. `project_impacts`: Qualitative and quantitative impact measurement records.

### Custom Enums Defined in PostgreSQL

* `user_role_enum`: `CITIZEN`, `UNIVERSITY_ADMIN`, `FACULTY`, `STUDENT`, `INDUSTRY`, `GOVERNMENT`, `PLATFORM_ADMIN`.
* `organization_type_enum`: `INSTITUTION`, `INDUSTRY`, `GOVERNMENT`, `NGO`, `COMMUNITY_ORGANIZATION`, `OTHER`.
* `verification_status_enum`: `UNVERIFIED`, `PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`.
* `capability_source_enum`: `OFFICIAL_WEBSITE`, `PUBLIC_DATA`, `ORGANIZATION_PROVIDED`, `ADMIN_ENTERED`, `PROJECT_HISTORY`, `PARTNER_VERIFIED`.
* `challenge_status_enum`: `SUBMITTED`, `UNDER_REVIEW`, `VALIDATED`, `REJECTED`, `MATCHING`, `MATCHED`, `IN_PROGRESS`, `COMPLETED`, `CLOSED`.
* `challenge_priority_enum`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
* `evidence_type_enum`: `IMAGE`, `VIDEO`, `DOCUMENT`, `LINK`, `LOCATION_DATA`, `SURVEY_DATA`, `OTHER`.
* `project_status_enum`: `PROPOSED`, `APPROVED`, `IN_DEVELOPMENT`, `PILOT_DEPLOYMENT`, `VERIFIED`, `COMPLETED`, `CANCELLED`.
* `review_status_enum`: `PENDING`, `APPROVED`, `REJECTED`, `MODIFIED`.

## AI/ML

* **Status in Phase 2**: Structural readiness only.
* Created `challenge_ai_analysis` table with columns for `priority_score`, `severity_score`, `duplicate_group`, `embedding_reference`, `model_name`, `confidence`, and `raw_analysis` (JSONB).
* Created `recommendation_reviews` with `ai_match_reasons` (JSONB) for explainable AI reasoning.
* **No AI models or inference were executed in Phase 2**.

## APIs

* Database CLI and Migration tooling:
  * `npm run migration:run`: Executes pending TypeORM migrations.
  * `npm run migration:revert`: Reverts latest migration.
  * `npm run seed:run`: Seeds minimal development records.
  * `npm run test:phase2`: Runs automated database relational verification suite.

## Security / Validation

* Foreign keys enforce relational integrity (`ON DELETE CASCADE` on child profiles, `ON DELETE SET NULL` on audit references).
* UUID primary keys (`uuid_generate_v4()`) prevent predictable enumeration attacks.
* Unique constraints enforce data hygiene (e.g., capability names, industry sector codes, institution codes).
* Strict separation between database migrations and runtime entity synchronisation (`synchronize: false`).

## Inputs

* SQL migration script: `1710000000000-InitialDatabaseSchema.ts`.
* Minimal development seed dataset: `minimal-dev-seed.ts`.

## Outputs

* Fully initialized PostgreSQL database schema containing all 23 relational tables, custom PostgreSQL enums, and foreign-key indexes.

## Current Implementation

* Fully implemented, migrated, and verified via `test/verify-database.ts`.

## Dependencies

* PostgreSQL 16 (`uuid-ossp`)
* TypeORM 0.3+
* `pg` driver

## Decisions Made

1. **Strict Decoupling of Organization from Profiles**: Separate tables (`institution_profiles` and `industry_profiles`) link to a generic `organizations` table. This allows institutions and enterprises to have distinct metadata without schema pollution.
2. **Capability Provenance Design**: Every capability claimed by an institution or enterprise requires an associated source and verification status, preventing unverified capability inflation.
3. **Pre-allocating AI & Explainability Containers**: Database tables for AI analysis and recommendation reviews were provisioned in Phase 2 to guarantee that future AI microservice phases plug into a pre-validated schema.

## Future Enhancements

* User authentication, password hashing, and multi-tenant organization membership (implemented in Phase 3).
* Challenge reporting and crowdsourcing foundation (implemented in Phase 4).

## Status

**Completed**.
