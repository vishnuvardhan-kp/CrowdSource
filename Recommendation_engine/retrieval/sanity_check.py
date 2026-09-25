import logging
from db import get_db
from retrieval import RetrievalEngine, ProblemDef
from sqlalchemy.exc import OperationalError, PendingRollbackError

logging.basicConfig(level=logging.INFO, format='%(message)s')

def run_sanity_check():
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        engine = RetrievalEngine(db=db, k=20)
    except Exception as e:
        print(f"Engine failed to init: {e}")
        return

    problems = [
        ProblemDef(
            problem_id="PR_AGRI_01",
            title="Improving crop productivity through soil monitoring",
            description="Farmers are facing reduced crop productivity because of poor soil nutrient management and lack of timely soil information.",
            domain="Agriculture",
            keywords=["soil", "crop productivity", "nutrients", "agriculture"]
        ),
        ProblemDef(
            problem_id="PR_WATER_02",
            title="Water quality assurance in rural areas",
            description="Groundwater contamination with heavy metals prevents access to clean drinking water.",
            domain="Water Resources",
            keywords=["water quality", "groundwater", "contamination", "drinking water"]
        ),
        ProblemDef(
            problem_id="PR_HLTH_03",
            title="Early detection of respiratory diseases using wearable IoT",
            description="Rural populations lack early diagnostics. Wearable IoT masks can identify symptoms.",
            domain="Healthcare",
            keywords=["respiratory", "wearable", "IoT", "diagnostics"]
        )
    ]

    print("=== RETRIEVAL SANITY CHECK ===\n")

    for prob in problems:
        print("="*60)
        print(f"[RETRIEVAL]")
        print(f"Problem ID: {prob.problem_id}")
        
        try:
            result = engine.retrieve(prob)
            
            print(f"\n[PAPERS]")
            print(f"Requested: {engine.k} | Retrieved: {len(result.papers)}")
            if result.papers:
                print("Top Paper Candidates:")
                for c in result.papers[:5]:
                    print(f"  [{c.similarity_score:.4f}] ID:{c.database_id} | {c.metadata.get('title')}")
                    
            print(f"\n[DATASETS]")
            print(f"Requested: {engine.k} | Retrieved: {len(result.datasets)}")
            if result.datasets:
                print("Top Dataset Candidates:")
                for c in result.datasets[:5]:
                    print(f"  [{c.similarity_score:.4f}] ID:{c.database_id} | {c.metadata.get('name')}")
        except OperationalError as e:
            print("\n🚨 [DATABASE ERROR]")
            print("PostgreSQL connection failed securely as configured.")
            print("To resolve, ensure 'sih_user' holds the correct credentials locally via psql.")
            print(f"Details: {e.orig}")
            break
        except Exception as e:
            print(f"Retrieval error: {e}")
            break
        print("="*60 + "\n")


if __name__ == "__main__":
    run_sanity_check()
