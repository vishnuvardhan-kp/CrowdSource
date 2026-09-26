from retrieval.models import RetrievalResult
from reranking.models import RerankedResult
from reranking.paper_ranker import PaperRanker
from reranking.dataset_ranker import DatasetRanker
from reranking.config import PaperWeights, DatasetWeights

class RerankingEngine:
    def __init__(self, paper_weights: PaperWeights = None, dataset_weights: DatasetWeights = None, current_year: int = 2026):
        self.p_ranker = PaperRanker(weights=paper_weights or PaperWeights(), current_year=current_year)
        self.d_ranker = DatasetRanker(weights=dataset_weights or DatasetWeights())
        
    def rerank(self, retrieval_result: RetrievalResult, top_n_papers: int = 10, top_n_datasets: int = 10) -> RerankedResult:
        rp = self.p_ranker.rank(retrieval_result.problem, retrieval_result.papers, top_n=top_n_papers)
        rd = self.d_ranker.rank(retrieval_result.problem, retrieval_result.datasets, top_n=top_n_datasets)
        
        return RerankedResult(
            problem_id=retrieval_result.problem.problem_id,
            problem=retrieval_result.problem,
            papers=rp,
            datasets=rd
        )
