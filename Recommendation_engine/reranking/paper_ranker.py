from typing import List
from retrieval.models import ProblemDef, RetrievedCandidate
from reranking.models import RerankedCandidate, ScoreBreakdown
from reranking.config import PaperWeights
from reranking.scoring import (
    calculate_keyword_score,
    calculate_domain_score,
    calculate_recency_score,
    calculate_citation_score
)

class PaperRanker:
    def __init__(self, weights: PaperWeights = PaperWeights(), current_year: int = 2026):
        self.weights = weights
        self.current_year = current_year

    def rank(self, problem: ProblemDef, candidates: List[RetrievedCandidate], top_n: int = 10) -> List[RerankedCandidate]:
        if not candidates:
            return []

        # Find max citations dynamically in the retrieved subset for localized normalization
        max_citations = max([c.metadata.get("citation_count") or 0 for c in candidates] + [0])
        
        scored = []
        for c in candidates:
            # 1. Semantic (Assuming incoming score from IndexFlatIP L2 is cosine similarity approx 0-1)
            semantic = max(0.0, min(1.0, c.similarity_score))
            
            # 2. Keyword
            kw_strings = [
                c.metadata.get("title", ""),
                c.metadata.get("abstract", "")
            ]
            
            # handle lists in topics/keywords
            kws = c.metadata.get("keywords")
            if kws and isinstance(kws, list):
                kw_strings.extend(kws)
                
            tps = c.metadata.get("topics")
            if tps and isinstance(tps, list):
                kw_strings.extend(tps)
                
            keyword = calculate_keyword_score(problem, kw_strings)
            
            # 3. Domain
            domain = calculate_domain_score(problem.domain, c.metadata.get("domain"))
            
            # 4. Recency
            recency = calculate_recency_score(c.metadata.get("publication_year"), self.current_year)
            
            # 5. Citation
            citation = calculate_citation_score(c.metadata.get("citation_count"), max_citations)
            
            # Weighted 
            final_score = (
                self.weights.semantic * semantic +
                self.weights.keyword * keyword +
                self.weights.domain * domain +
                self.weights.recency * recency +
                self.weights.citation * citation
            )
            
            brk = ScoreBreakdown(
                semantic=semantic,
                keyword=keyword,
                domain=domain,
                recency=recency,
                citation=citation
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
