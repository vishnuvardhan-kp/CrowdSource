import argparse
import json
from db import get_db
from retrieval import RetrievalEngine, ProblemDef
import logging

logging.basicConfig(level=logging.INFO, format="%(message)s")

def main():
    parser = argparse.ArgumentParser(description="Query SIH KB for problem representations.")
    parser.add_argument("--problem-id", type=str, required=True, help="Unique identifier for the problem")
    parser.add_argument("--title", type=str, required=True, help="Problem title")
    parser.add_argument("--description", type=str, default="", help="Problem description")
    parser.add_argument("--domain", type=str, default="", help="Problem domain")
    parser.add_argument("--keywords", type=str, default="", help="Comma separated keywords")
    parser.add_argument("--k", type=int, default=20, help="Number of records to retrieve")
    
    args = parser.parse_args()
    
    kws = [k.strip() for k in args.keywords.split(",")] if args.keywords else []
    
    prob = ProblemDef(
        problem_id=args.problem_id,
        title=args.title,
        description=args.description,
        domain=args.domain,
        keywords=kws
    )
    
    db = next(get_db())
    engine = RetrievalEngine(db=db, k=args.k)
    
    logging.info(f"[RETRIEVAL]\nProblem ID: {prob.problem_id}")
    logging.info(f"[EMBEDDING]\nModel: {engine.embedding_service.model_name}\nDimension: {engine.embedding_service.dimension}")
    
    result = engine.retrieve(prob)
    
    logging.info(f"[PAPERS]\nIndex size: {engine.paper_index.ntotal}\nRequested: {args.k}\nRetrieved: {len(result.papers)}")
    logging.info(f"[DATASETS]\nIndex size: {engine.dataset_index.ntotal}\nRequested: {args.k}\nRetrieved: {len(result.datasets)}")
    
    logging.info(f"[DATABASE]\nPaper metadata fetched: {len(result.papers)}\nDataset metadata fetched: {len(result.datasets)}")

    # Just print raw internal block to prove JSON compatibility for Module 4 boundary
    output = {
        "problem_id": result.problem.problem_id,
        "papers_retrieved": len(result.papers),
        "datasets_retrieved": len(result.datasets)
    }
    
    print("\n--- Summary Result Dump ---")
    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()
