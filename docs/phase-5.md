# Phase 5 — AI Intelligence & Ecosystem Matching

> Phase 5 implements provider-agnostic AI problem understanding, taxonomy normalization, capability passport intelligence, versioned semantic embeddings, hybrid scoring, explainable recommendations, and human-in-the-loop review governance.

---

## 1. Objective

Transform citizen-reported societal challenges into structured, machine-understandable problem representations and intelligently match relevant Higher Education Institutions (HEIs), industry partners, and startups using multi-factor hybrid scoring while ensuring authoritative human governance.

---

## 2. Scope & Boundaries

### Included in Phase 5
* Provider-agnostic AI inference microservice (`ai-service/`) supporting NVIDIA-hosted NIMs and deterministic offline mock providers.
* Structured AI Problem Intelligence extraction (domains, sub-domains, problem factors, constraints, severity, affected population).
* Taxonomy Normalization Engine mapping free-text LLM capability terms to official taxonomy IDs with alias resolution and review fallbacks.
* Capability Passport representation with verification provenance and dynamic Availability TTL.
* Versioned vector embeddings (`entity_embeddings` table) with source text hashes and atomic re-indexing safeguards.
* Candidate Retrieval & Hard Eligibility filtering.
* Hybrid Matching Engine combining semantic similarity, structured capability match, specialized HEI vs Industry expertise, geographic relevance, verification confidence, availability freshness, and bounded novelty exploration.
* Explainability engine deriving match justifications from actual scoring signals.
* Human Review Triage (`HIGH_CONFIDENCE`, `MEDIUM_CONFIDENCE`, `LOW_CONFIDENCE`) and bulk review decisions.
* Frontend AI Problem Intelligence Card on challenge details page.

### Explicitly Excluded (Phase 6 or Later)
* Collaboration invitations, agreements, and requests.
* Team formation and student/faculty assignment.
* Funding, CSR grants, and mentorship workflows.
* Pilot execution, workspace management, and impact tracking.

---

## 3. Architecture Overview

```text
Citizen Challenge (Validated)
       ↓
AI Problem Intelligence (FastAPI / NVIDIA NIM / Mock)
       ↓
Taxonomy Normalization Layer (Aliases & Exact Mapping)
       ↓
Structured Problem Representation (challenge_ai_analysis)
       ↓
Versioned Vector Embeddings (entity_embeddings - 1024d)
       ↓
Ecosystem Registries (HEIs, Faculty, Labs, Industry, Support Types)
       ↓
Staged Candidate Retrieval
       ↓
Deterministic Hard Eligibility Filtering
       ↓
Hybrid Scoring Engine (Semantic + Capability + Geo + Verification + TTL + Novelty)
       ↓
Reranking Layer (Relevance Logits)
       ↓
Explainable Justification Derivation
       ↓
Review Triage Classification (High / Medium / Low Confidence)
       ↓
Authoritative Human Review Governance (recommendation_reviews)
       ↓
Approved Recommendations (Ready for Phase 6)
```

---

## 4. AI Provider Abstraction & NVIDIA NIM Integration

The AI microservice (`ai-service/`) is completely decoupled from provider specifics:

```python
BaseAIProvider
├── analyze_challenge()
├── generate_embeddings()
└── rerank()
```

* **Providers Implemented**:
  * `NvidiaAIProvider`: Connects to `https://integrate.api.nvidia.com/v1` via OpenAI-compatible endpoints (`/v1/chat/completions`, `/v1/embeddings`, `/v1/ranking`).
  * `MockAIProvider`: Fully deterministic, high-speed offline provider for CI/CD and local development.
* **Environment Configuration**:
  * `AI_PROVIDER`: `nvidia` or `mock`
  * `LLM_MODEL`: e.g. `meta/llama-3.1-70b-instruct`
  * `EMBEDDING_MODEL`: e.g. `nvidia/nv-embed-v1`
  * `RERANKER_MODEL`: e.g. `nvidia/rerank-qa-mistral-4b`
  * `NVIDIA_API_KEY`: Kept private and never exposed to the frontend or source control.

---

## 5. Taxonomy Normalization

Prevent arbitrary LLM capability strings from corrupting the ecosystem catalog:
* **Exact match**: Direct match against official taxonomy database names or slugs.
* **Alias / Synonym resolution**: Maps synonyms (e.g., `"smart agricultural sensors"` → `"Internet of Things (IoT)"`).
* **Overlap matching**: Token-based intersection against official capability names.
* **Low-confidence Fallback**: Unrecognized terms are flagged with `requires_review = true` rather than inventing unverified taxonomy entities.

---

## 6. Capability Passport & Ecosystem Provenance

* **HEI Profiles**: Captured via `InstitutionProfile`, `Department`, `FacultyMember` (with specializations), `Laboratory` (with equipment), `ResearchArea`, and `InstitutionCapability`.
* **Industry / Startup Profiles**: Captured via `IndustryProfile`, `IndustrySector`, `IndustrySupportType` (Prototyping, Funding, Hardware, Pilot Deployment), and `IndustryCapability`.
* **Verification Provenance**: Every capability retains `source` (`CapabilitySource`), `verification_status` (`VerificationStatus`), `confidence_score`, and `evidence_summary`.
* **Availability TTL**: Dynamic availability status (`FRESH`, `STALE`, `UNKNOWN`) based on `available_capacity`, `availability_confirmed_at`, and `availability_expires_at` (14-day default TTL).

---

## 7. Versioned Vector Embeddings & Re-indexing

Stored in PostgreSQL via the `entity_embeddings` table:
* Columns: `entity_type`, `entity_id`, `embedding_version`, `model_provider`, `model_name`, `dimensions`, `source_text`, `source_text_hash`, `embedding` (float array), `is_active`.
* **Model Change & Re-indexing Strategy**:
  1. Background async worker triggers candidate vector generation.
  2. Integrity and dimension validation against source text hashes.
  3. Coverage validation.
  4. Atomic activation of new embedding version without corrupting existing vectors.

---

## 8. Hybrid Matching & Explainable Scoring

Total score is computed across multi-factor signals (0–100%):

$$\text{Total Score} = w_{\text{sem}} S_{\text{sem}} + w_{\text{cap}} S_{\text{cap}} + w_{\text{exp}} S_{\text{exp}} + w_{\text{geo}} S_{\text{geo}} + w_{\text{ver}} S_{\text{ver}} + w_{\text{avail}} S_{\text{avail}} + \text{Boost}_{\text{novelty}}$$

* **Semantic Similarity ($S_{\text{sem}}$)**: Cosine similarity on embeddings or lexical overlap fallback.
* **Capability Match ($S_{\text{cap}}$)**: Overlap between normalized required capabilities and verified organizational capabilities.
* **Domain Expertise ($S_{\text{exp}}$)**: Organization-type specific scoring (Faculty/Labs for HEIs; Support Types/Tech for Industry).
* **Geographic Relevance ($S_{\text{geo}}$)**: District match (1.0), State match (0.8), National (0.5).
* **Verification Confidence ($S_{\text{ver}}$)**: Verified (1.0), Pending (0.7), Unverified (0.5).
* **Availability Freshness ($S_{\text{avail}}$)**: Fresh within TTL (1.0), Stale bounded penalty (0.75), Unknown (0.50).
* **Novelty Exploration Boost**: Small bounded boost for verified new entrants to prevent recommendation stagnation.
* **Explainability**: Match reasons are directly derived from scoring signals (not post-hoc LLM hallucinations).

---

## 9. Human Review Governance & Triage

* **Review Triage Categories**: `HIGH_CONFIDENCE` ($\ge 80\%$), `MEDIUM_CONFIDENCE` ($60-79\%$), `LOW_CONFIDENCE` ($< 60\%$).
* **Reviewer Actions**:
  * `APPROVE`: Authorizes recommendation for Phase 6.
  * `REJECT`: Requires a mandatory rejection reason note for future evaluation.
  * `MODIFY`: Overrides matching weights or parameters.
  * `BULK_DECISION`: Allows expedited triage approval for high-confidence matches.

---

## 10. Database Schema Additions

* **`entity_embeddings`**: Stores versioned float vectors with text hashes and active flags.
* **`recommendation_runs`**: Tracks matching runs with scoring configurations for 100% reproducibility.
* **`organizations` additions**: `available_capacity`, `availability_confirmed_at`, `availability_expires_at`, `availability_status`.

---

## 11. Verification & Testing Summary

* **AI Service Suite (`ai-service/test_ai_service.py`)**: 6/6 test groups passed (Factory, Analysis, Taxonomy Normalization, Embeddings, Reranking, Async Reindex).
* **Master Backend Verification (`test/verify-phase5.ts`)**: 29/29 assertions passed across provider abstraction, challenge analysis, immutability, vector embeddings, capability passport, hybrid matching, and review triage.
* **Complete Regression (`test/run-all-tests.ts`)**: 100% passed across Phase 2, Phase 3, Phase 4, and Phase 5 suites (174/174 assertions).
* **Frontend Build**: Clean compilation without TypeScript errors.

---

## 12. Implementation Status

| Component | Status | Details |
| :--- | :--- | :--- |
| **AI Provider Abstraction** | **Implemented** | `BaseAIProvider`, `NvidiaAIProvider`, `MockAIProvider`, `get_ai_provider()` |
| **NVIDIA NIM Integration** | **Configured** | OpenAI-compatible client with configurable models and secure env handling |
| **AI Challenge Analysis** | **Implemented** | Extracts structured problem factors, entities, severity, and capabilities |
| **Taxonomy Normalization** | **Implemented** | Maps to official DB capabilities with alias matching and review fallback |
| **Capability Passport** | **Implemented** | HEI labs/faculty & Industry support types with provenance and TTL |
| **Versioned Embeddings** | **Implemented** | `entity_embeddings` with source hashes and async re-indexing |
| **Hybrid Matching Engine**| **Implemented** | Multi-signal scoring with HEI vs Industry profiles and explainability |
| **Human Review Governance**| **Implemented** | Review triage, approve/reject workflow, and audit persistence |
| **Frontend AI Card** | **Implemented** | Interactive AI Problem Intelligence card on `/challenges/[id]` |
| **Model Fine-tuning** | **Future** | Architecture is ready for reviewed dataset export; fine-tuning deferred |
