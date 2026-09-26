from dataclasses import dataclass, field
from typing import List, Optional, Any, Dict

@dataclass
class ProblemDef:
    problem_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    keywords: List[str] = field(default_factory=list)

@dataclass
class RetrievedCandidate:
    database_id: int
    faiss_position: int
    similarity_score: float
    metadata: Dict[str, Any]

@dataclass
class RetrievalResult:
    problem: ProblemDef
    papers: List[RetrievedCandidate] = field(default_factory=list)
    datasets: List[RetrievedCandidate] = field(default_factory=list)
