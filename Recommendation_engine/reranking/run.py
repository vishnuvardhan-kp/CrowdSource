import argparse
import sys
import logging
from db import get_db
from retrieval import RetrievalEngine, ProblemDef
from reranking import RerankingEngine

# We want clean output, not heavy logging for this payload dump
logging.basicConfig(level=logging.ERROR)

def main():
    parser = argparse.ArgumentParser(description="End-to-End Problem to Ranked Candidates")
    parser.add_argument("--problem-id", type=str, required=True, help="Unique identifier for the problem")
    parser.add_argument("--title", type=str, required=True, help="Problem title")
    parser.add_argument("--description", type=str, default="", help="Problem description")
    parser.add_argument("--domain", type=str, default="", help="Problem domain")
    parser.add_argument("--keywords", type=str, default="", help="Comma separated keywords")
    parser.add_argument("--top-k-retrieval", type=int, default=20, help="Initial FAISS lookup pool")
    parser.add_argument("--top-k-final", type=int, default=10, help="Final output limit")
    
    args = parser.parse_args()
    kws = [k.strip() for k in args.keywords.split(",")] if args.keywords else []
    
    prob = ProblemDef(
        problem_id=args.problem_id,
        title=args.title,
        description=args.description,
        domain=args.domain,
        keywords=kws
    )
    
    print(f"=== E2E RECOMMENDATION PIPELINE ===")
    print(f"Problem: {prob.title}\nDomain: {prob.domain}\nKeywords: {kws}\n")
    print(f"[>] Generating Problem Text & Embedding...")
    
    try:
        db = next(get_db())
    except Exception as e:
        print(f"CRITICAL: Could not reach PostgreSQL to initialize engines. Are you sure credentials are working locally?")
        print(e)
        sys.exit(1)
        
    try:
        retrieval_engine = RetrievalEngine(db=db, k=args.top_k_retrieval)
        rerank_engine = RerankingEngine(current_year=2026)
    except Exception as e:
        print(f"CRITICAL: Failed to load FAISS layers. Did Module 2 execute properly?")
        print(e)
        sys.exit(1)
        
    print(f"[>] Searching FAISS (Top {args.top_k_retrieval} Phase)...")
    try:
        raw_candidates = retrieval_engine.retrieve(prob)
    except Exception as e:
        print(f"CRITICAL: Retrieval search failed.")
        print(e)
        sys.exit(1)
        
    print(f"[>] Computing Rerank Math (Top {args.top_k_final} Phase)...\n")
    final_payload = rerank_engine.rerank(raw_candidates, top_n_papers=args.top_k_final, top_n_datasets=args.top_k_final)
    
    # -----------------------------
    # Output Print Structure
    # -----------------------------
    print("=" * 60)
    print("TOP RANKED RESEARCH PAPERS")
    print("=" * 60)
    
    if not final_payload.papers:
        print("No papers retrieved.")
    else:
        for i, p in enumerate(final_payload.papers, start=1):
            title = p.metadata.get('title', 'Unknown Title')
            url = p.metadata.get('open_access_url') or p.metadata.get('pdf_url') or p.metadata.get('paper_url') or 'N/A'
            
            print(f"{i}. {title}")
            print(f"   [Final Score: {p.final_score:.3f} | Semantic Match: {p.retrieval_score:.3f}]")
            print(f"   Breakdown: Sem={p.score_breakdown.semantic:.2f} Kw={p.score_breakdown.keyword:.2f} Dom={p.score_breakdown.domain:.2f} Rec={p.score_breakdown.recency:.2f} Cit={p.score_breakdown.citation:.2f}")
            print(f"   URL: {url}")
            print("")
            
    print("=" * 60)
    print("TOP RANKED DATASETS")
    print("=" * 60)
    
    if not final_payload.datasets:
        print("No datasets retrieved.")
    else:
        for i, d in enumerate(final_payload.datasets, start=1):
            name = d.metadata.get('name', 'Unknown Dataset')
            url = d.metadata.get('access_url') or d.metadata.get('source_url') or 'N/A'
            
            print(f"{i}. {name}")
            print(f"   [Final Score: {d.final_score:.3f} | Semantic Match: {d.retrieval_score:.3f}]")
            print(f"   Breakdown: Sem={d.score_breakdown.semantic:.2f} Kw={d.score_breakdown.keyword:.2f} Dom={d.score_breakdown.domain:.2f} Geo={d.score_breakdown.geographic:.2f}")
            print(f"   URL: {url}")
            print("")

if __name__ == "__main__":
    main()
