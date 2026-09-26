import json
from retrieval.models import ProblemDef, RetrievedCandidate, RetrievalResult
from reranking import RerankingEngine

def run_sanity_check():
    # Deterministic Mock problem
    prob = ProblemDef(
        problem_id="PR_MOCK_01",
        title="Soil Moisture Analysis",
        description="Assessing soil in rural farms",
        domain="Agriculture",
        keywords=["soil", "moisture"]
    )
    
    # Mock Candidates (Retrieved from Module 3 conceptually)
    papers = [
        RetrievedCandidate(
            database_id=1, faiss_position=5, similarity_score=0.9, 
            metadata={"title": "Soil Moisture Sensors", "domain": "Agriculture", "publication_year": 2025, "citation_count": 50, "keywords": ["soil"]}
        ),
        RetrievedCandidate(
            database_id=2, faiss_position=7, similarity_score=0.8, 
            metadata={"title": "IoT in Farming", "domain": "Tech", "publication_year": 2010, "citation_count": 500}
        ),
        RetrievedCandidate(
            database_id=3, faiss_position=2, similarity_score=0.95, 
            metadata={"title": "Unrelated Medical Tech", "domain": "Healthcare", "publication_year": 2026, "citation_count": 0}
        )
    ]
    
    datasets = [
        RetrievedCandidate(
            database_id=10, faiss_position=1, similarity_score=0.85, 
            metadata={"name": "Rural Soil Data", "domain": "Agriculture", "geographic_scope": "Rural farms"}
        ),
        RetrievedCandidate(
            database_id=11, faiss_position=2, similarity_score=0.88, 
            metadata={"name": "Urban Traffic Data", "domain": "Transport", "geographic_scope": "City"}
        )
    ]

    mock_result_mod3 = RetrievalResult(problem=prob, papers=papers, datasets=datasets)
    engine = RerankingEngine(current_year=2026)
    
    print("=== RANKING SANITY CHECK ===\n")
    print(f"Problem:\n  {prob.title} | Domain: {prob.domain} | KWs: {prob.keywords}\n")
    
    result = engine.rerank(mock_result_mod3, top_n_papers=5, top_n_datasets=5)
    
    print("Top Papers:")
    for c in result.papers:
        print(f"  [{c.final_score:.3f}] {c.metadata.get('title')}")
        print(f"      Retrieval Score: {c.retrieval_score:.3f}")
        print(f"      Breakdown: Sem={c.score_breakdown.semantic:.2f} Kw={c.score_breakdown.keyword:.2f} "
              f"Dom={c.score_breakdown.domain:.2f} Rec={c.score_breakdown.recency:.2f} Cit={c.score_breakdown.citation:.2f}")
              
    print("\nTop Datasets:")
    for c in result.datasets:
        print(f"  [{c.final_score:.3f}] {c.metadata.get('name')}")
        print(f"      Retrieval Score: {c.retrieval_score:.3f}")
        print(f"      Breakdown: Sem={c.score_breakdown.semantic:.2f} Kw={c.score_breakdown.keyword:.2f} "
              f"Dom={c.score_breakdown.domain:.2f} Geo={c.score_breakdown.geographic:.2f}")

if __name__ == "__main__":
    run_sanity_check()
