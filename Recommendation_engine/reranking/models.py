from dataclasses import dataclass, field
from typing import Dict, Any, List
from retrieval.models import ProblemDef

@dataclass
class ScoreBreakdown:
    semantic: float = 0.0
    keyword: float = 0.0
    domain: float = 0.0
    recency: float = 0.0
    citation: float = 0.0
    geographic: float = 0.0

@dataclass
class RerankedCandidate:
    database_id: int
    faiss_position: int
    retrieval_score: float
    final_score: float
    score_breakdown: ScoreBreakdown
    metadata: Dict[str, Any]

@dataclass
class RerankedResult:
    problem_id: str
    problem: ProblemDef
    papers: List[RerankedCandidate] = field(default_factory=list)
    datasets: List[RerankedCandidate] = field(default_factory=list)
