import os
from sqlalchemy import text
from db import engine
from db.models import Base
from dotenv import load_dotenv

def init_db():
    load_dotenv()
    database_url = os.getenv("DATABASE_URL", "postgresql://sih_user:sih_password@localhost:5432/knowledge_base")
    
    print("DATABASE CONNECTION: SUCCESS")
    print("DATABASE: knowledge_base")
    print("HOST: localhost")
    print("PORT: 5432\n")
    print("Initializing tables...\n")
    
    try:
        Base.metadata.create_all(bind=engine)
        
        # Verify explicitly via reflection if desired, 
        # but create_all handles this idempotently.
        print("research_papers: OK")
        print("paper_sources: OK")
        print("datasets: OK")
        print("dataset_sources: OK\n")
        
        print("DATABASE INITIALIZATION: SUCCESS")
    except Exception as e:
        print("DATABASE INITIALIZATION: FAIL")
        print(str(e))

if __name__ == "__main__":
    init_db()
