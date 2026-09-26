from typing import List
from retrieval.models import ProblemDef, RetrievedCandidate
from reranking.models import RerankedCandidate, ScoreBreakdown
from reranking.config import DatasetWeights
from reranking.scoring import (
    calculate_keyword_score,
    calculate_domain_score,
    calculate_geographic_score
)

class DatasetRanker:
    def __init__(self, weights: DatasetWeights = DatasetWeights()):
        self.weights = weights

    def rank(self, problem: ProblemDef, candidates: List[RetrievedCandidate], top_n: int = 10) -> List[RerankedCandidate]:
        if not candidates:
            return []
            
        scored = []
        for c in candidates:
            # 1. Semantic
            semantic = max(0.0, min(1.0, c.similarity_score))
            
            # 2. Keyword
            kw_strings = [
                c.metadata.get("name", ""),
                c.metadata.get("description", "")
            ]
            
            kws = c.metadata.get("keywords")
            if kws and isinstance(kws, list):
                kw_strings.extend(kws)
                
            fts = c.metadata.get("features")
            if fts and isinstance(fts, list):
                kw_strings.extend(fts)
                
            keyword = calculate_keyword_score(problem, kw_strings)
            
            # 3. Domain
            domain = calculate_domain_score(problem.domain, c.metadata.get("domain"))
            
            # 4. Geographic
            geo = calculate_geographic_score(problem, c.metadata.get("geographic_scope"))
            
            # Weighted 
            final_score = (
                self.weights.semantic * semantic +
                self.weights.keyword * keyword +
                self.weights.domain * domain +
                self.weights.geographic * geo
            )
            
            brk = ScoreBreakdown(
                semantic=semantic,
                keyword=keyword,
                domain=domain,
                geographic=geo
            )
            
            rc = RerankedCandidate(
                database_id=c.database_id,
                faiss_position=c.faiss_position,
                retrieval_score=c.similarity_score,
                final_score=final_score,
                score_breakdown=brk,
                metadata=c.metadata
            )
            scored.append(rc)
            
        # Tie breakers: final_score DESC, semantic_score DESC, database_id ASC
        scored.sort(key=lambda x: (x.final_score, x.score_breakdown.semantic, -x.database_id), reverse=True)
        return scored[:top_n]
