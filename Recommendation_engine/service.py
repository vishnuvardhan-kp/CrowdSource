import os
import sys
import logging
from contextlib import asynccontextmanager
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure Recommendation_engine is on path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from db import get_db, SessionLocal
from db.models import ResearchPaper, Dataset
from retrieval import RetrievalEngine, ProblemDef
from reranking import RerankingEngine
from embeddings.service import EmbeddingService, IndexLoader

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("research-intelligence-api")

# Models for request and response
class ResearchRecommendationRequest(BaseModel):
    problem_id: str = Field(..., description="Unique civic challenge identifier")
    title: Optional[str] = Field(None, description="Problem title")
    description: Optional[str] = Field(None, description="Normalized or structured description")
    domain: Optional[str] = Field(None, description="Domain / Category of the problem")
    keywords: List[str] = Field(default_factory=list, description="Keywords and capability tags")
    top_n_papers: int = Field(default=10, ge=1, le=50, description="Max papers to return")
    top_n_datasets: int = Field(default=10, ge=1, le=50, description="Max datasets to return")

class ScoreBreakdownDto(BaseModel):
    semantic: float
    keyword: float
    domain: float
    recency: Optional[float] = None
    citation: Optional[float] = None
    geographic: Optional[float] = None

class PaperRecommendationDto(BaseModel):
    id: int
    title: str
    abstract: Optional[str] = None
    authors: Optional[List[str]] = None
    publication_year: Optional[int] = None
    venue: Optional[str] = None
    doi: Optional[str] = None
    paper_url: Optional[str] = None
    publisher_url: Optional[str] = None
    open_access_url: Optional[str] = None
    pdf_url: Optional[str] = None
    is_open_access: bool = False
    citation_count: int = 0
    keywords: Optional[List[str]] = None
    domain: Optional[str] = None
    relevance_score: float
    retrieval_score: float
    score_breakdown: ScoreBreakdownDto

class DatasetRecommendationDto(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    domain: Optional[str] = None
    keywords: Optional[List[str]] = None
    features: Optional[List[str]] = None
    geographic_scope: Optional[str] = None
    size_description: Optional[str] = None
    format: Optional[str] = None
    license: Optional[str] = None
    source_url: Optional[str] = None
    access_url: Optional[str] = None
    relevance_score: float
    retrieval_score: float
    score_breakdown: ScoreBreakdownDto

class ResearchRecommendationResponse(BaseModel):
    problem_id: str
    papers: List[PaperRecommendationDto]
    datasets: List[DatasetRecommendationDto]
    computed_at: str
    status: str = "success"

class HealthResponse(BaseModel):
    status: str
    service: str = "ResolvIN Research Intelligence Recommendation Engine"
    embedding_model: str
    embedding_dimension: int
    paper_index_vectors: int
    dataset_index_vectors: int
    database_connected: bool
    version: str = "1.0.0"

# Application Lifespan - Preload models and indexes once
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Research Recommendation Service...")
    
    # 1. Database check
    db = SessionLocal()
    db_connected = False
    try:
        p_count = db.query(ResearchPaper).count()
        d_count = db.query(Dataset).count()
        db_connected = True
        logger.info(f"Database connected. Knowledge Base: {p_count} papers, {d_count} datasets.")
    except Exception as e:
        logger.error(f"Database connection warning: {e}")
    
    # 2. Preload RetrievalEngine (loads MiniLM & FAISS indexes into memory)
    try:
        retrieval_engine = RetrievalEngine(db=db, k=25)
        reranking_engine = RerankingEngine(current_year=2026)
        app.state.retrieval_engine = retrieval_engine
        app.state.reranking_engine = reranking_engine
        app.state.db_session = db
        app.state.is_ready = True
        logger.info("Retrieval & Reranking engines initialized and ready in memory.")
    except Exception as e:
        logger.error(f"Failed to initialize engines: {e}", exc_info=True)
        app.state.retrieval_engine = None
        app.state.reranking_engine = None
        app.state.is_ready = False
        
    yield
    
    logger.info("Shutting down Research Recommendation Service...")
    db.close()

app = FastAPI(
    title="ResolvIN Research Intelligence API",
    description="Internal scholarly paper and dataset recommendation microservice for civic challenges",
    version="1.0.0",
    lifespan=lifespan
)

# Loopback / internal only CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3001", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
def get_health():
    is_ready = getattr(app.state, "is_ready", False)
    retrieval_engine = getattr(app.state, "retrieval_engine", None)
    
    p_count = 0
    d_count = 0
    dim = 384
    model_name = "all-MiniLM-L6-v2"
    
    if retrieval_engine and hasattr(retrieval_engine, "paper_index"):
        p_count = retrieval_engine.paper_index.ntotal
        d_count = retrieval_engine.dataset_index.ntotal
        dim = retrieval_engine.embedding_service.dimension
        model_name = retrieval_engine.embedding_service.model_name
        
    return HealthResponse(
        status="ready" if is_ready else "degraded",
        embedding_model=model_name,
        embedding_dimension=dim,
        paper_index_vectors=p_count,
        dataset_index_vectors=d_count,
        database_connected=is_ready,
        version="1.0.0"
    )

@app.post("/v1/recommendations/research", response_model=ResearchRecommendationResponse)
def get_recommendations(req: ResearchRecommendationRequest):
    if not getattr(app.state, "is_ready", False) or not app.state.retrieval_engine:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Recommendation engine is not ready or indexes missing"
        )
        
    # Construct ProblemDef
    problem = ProblemDef(
        problem_id=req.problem_id,
        title=req.title or "",
        description=req.description or "",
        domain=req.domain or "",
        keywords=req.keywords or []
    )
    
    try:
        # Step 1: Retrieval via FAISS
        raw_candidates = app.state.retrieval_engine.retrieve(problem)
        
        # Step 2: Deterministic Reranking
        ranked = app.state.reranking_engine.rerank(
            raw_candidates,
            top_n_papers=req.top_n_papers,
            top_n_datasets=req.top_n_datasets
        )
    except Exception as e:
        logger.error(f"Error executing recommendation for problem {req.problem_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate recommendations"
        )
        
    # Transform papers
    out_papers: List[PaperRecommendationDto] = []
    for p in ranked.papers:
        meta = p.metadata
        out_papers.append(PaperRecommendationDto(
            id=p.database_id,
            title=meta.get("title") or "Untitled Research Paper",
            abstract=meta.get("abstract"),
            authors=meta.get("authors"),
            publication_year=meta.get("publication_year"),
            venue=meta.get("venue"),
            doi=meta.get("doi"),
            paper_url=meta.get("paper_url"),
            publisher_url=meta.get("publisher_url"),
            open_access_url=meta.get("open_access_url"),
            pdf_url=meta.get("pdf_url"),
            is_open_access=meta.get("is_open_access", False),
            citation_count=meta.get("citation_count", 0),
            keywords=meta.get("keywords"),
            domain=meta.get("domain"),
            relevance_score=round(float(p.final_score), 4),
            retrieval_score=round(float(p.retrieval_score), 4),
            score_breakdown=ScoreBreakdownDto(
                semantic=round(float(p.score_breakdown.semantic), 4),
                keyword=round(float(p.score_breakdown.keyword), 4),
                domain=round(float(p.score_breakdown.domain), 4),
                recency=round(float(p.score_breakdown.recency), 4) if p.score_breakdown.recency is not None else None,
                citation=round(float(p.score_breakdown.citation), 4) if p.score_breakdown.citation is not None else None,
            )
        ))
        
    # Transform datasets
    out_datasets: List[DatasetRecommendationDto] = []
    for d in ranked.datasets:
        meta = d.metadata
        out_datasets.append(DatasetRecommendationDto(
            id=d.database_id,
            name=meta.get("name") or "Unnamed Civic Dataset",
            description=meta.get("description"),
            domain=meta.get("domain"),
            keywords=meta.get("keywords"),
            features=meta.get("features"),
            geographic_scope=meta.get("geographic_scope"),
            size_description=meta.get("size_description"),
            format=meta.get("format"),
            license=meta.get("license"),
            source_url=meta.get("source_url"),
            access_url=meta.get("access_url"),
            relevance_score=round(float(d.final_score), 4),
            retrieval_score=round(float(d.retrieval_score), 4),
            score_breakdown=ScoreBreakdownDto(
                semantic=round(float(d.score_breakdown.semantic), 4),
                keyword=round(float(d.score_breakdown.keyword), 4),
                domain=round(float(d.score_breakdown.domain), 4),
                geographic=round(float(d.score_breakdown.geographic), 4) if d.score_breakdown.geographic is not None else None,
            )
        ))
        
    return ResearchRecommendationResponse(
        problem_id=req.problem_id,
        papers=out_papers,
        datasets=out_datasets,
        computed_at=datetime.now(timezone.utc).isoformat(),
        status="success"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("service:app", host="127.0.0.1", port=8001, log_level="info")
