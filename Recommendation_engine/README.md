# SIH Research Recommendation Engine

## Architecture

This project is separated cleanly into independent data pipeline modules.

`Module 1`: Scrapes scholarly knowledge and builds a rigid PostgreSQL schema tracking strict source provenance.
`Module 2`: Builds Semantic FAISS Indices strictly atop Postgres resources.
`Module 3`: Exposes a strict problem-to-research retrieval engine that consumes University problems and outputs candidate clusters globally.
`Module 4`: Handles multi-factor **Deterministic Candidate Reranking** based on domain checks, keywords, recency, and citations to properly re-shuffle the semantic search array for localized value.

All modules are designed to run purely natively on Windows using local Python and a local Windows PostgreSQL service. **No Docker is required.** No external API runtime calls exist for modules 2, 3, and 4. Everything computes offline logically against your DB structures!

---

## Deploy Instructions (Mods 1-4)

### STEP 1: Prerequisites for Integration
Before integrating or running this module on your machine, you **MUST** install the following system dependencies:
1. **Python 3.10+**: Make sure Python is installed and added to your systemic PATH.
2. **PostgreSQL**: Download and install PostgreSQL natively (or run it via Docker). Ensure the service is running on port `5432`.

### STEP 2: Database Setup
After installing PostgreSQL, initialize the database environment:
```sql
CREATE USER sih_user WITH PASSWORD 'sih_password';
CREATE DATABASE knowledge_base OWNER sih_user;
```

### STEP 3: Python Environment
```bash
python -m venv venv
.\venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
```

### STEP 4: Executing the Pipeline!
```bash
# 1. Healthcheck OS DB Socket
python -m db.check

# 2. Build Postgres tables
python db/init_db.py

# 3. Pull datasets down limits 
python -m ingestion.openalex --max-papers 200
python -m ingestion.datasets --max-datasets 100

# 4. Generate Semantic Transformers Index
python -m embeddings.build_index
```

## Module 4 - Candidate Reranking

Module 3 strictly takes University queries, searches FAISS, and then maps FAISS indices cleanly backward into PostgreSQL to generate the output block.
However, Semantic Similarity is alone not sufficient to rank value. Module 4 intercepts the `RetrievalResult`, and recalculates positions strictly using missing-data resistant formulas applying `keyword relevance (20%)`, `domain relevance (15%)`, `recency decay (10%)`, and `logarithmic citation depth (5%)`.

### Module Interface & Diagram
```text
Problem
   ↓
Module 3
   ↓
Top 20 candidates
   ↓
Feature scoring
   ├── Semantic similarity
   ├── Keyword relevance
   ├── Domain relevance
   ├── Recency / Geographic relevance
   └── Citation strength for papers
   ↓
Weighted final score
   ↓
Deterministic sorting
   ↓
Top 10 papers + Top 10 datasets
   ↓
Module 5
```

### CLI Reranking Tests
To run sanity checks to see precisely why vectors get rescored visually:
```bash
python -m reranking.sanity_check
```

### Module 5 Developer Interface
Module 5 hooks into this engine like this:

```python
from db import get_db
from retrieval import RetrievalEngine, ProblemDef
from reranking import RerankingEngine

# Modules
retrieval = RetrievalEngine(db=next(get_db()), k=20)
reranking = RerankingEngine()

# Payload
problem = ProblemDef(
    problem_id="PR_AGRI_TEST",
    title="Improving rural crop metrics",
    keywords=["weather", "crops"]
)

# Pipeline
candidates = retrieval.retrieve(problem)
final_ranked_payload = reranking.rerank(candidates, top_n_papers=10)

for p in final_ranked_payload.papers:
    print(f"[{p.final_score}] Title: {p.metadata.get('title')}")
    print(f"Explainablity: {p.score_breakdown}")
```
