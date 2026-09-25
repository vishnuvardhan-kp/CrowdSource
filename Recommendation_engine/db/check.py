import sys
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

def check_db():
    load_dotenv()
    database_url = os.getenv("DATABASE_URL", "postgresql://sih_user:sih_password@localhost:5432/knowledge_base")
    
    print("=== DATABASE HEALTH CHECK ===")
    print(f"URL: {database_url}")
    
    try:
        engine = create_engine(database_url, connect_args={'connect_timeout': 5})
        with engine.connect() as conn:
            import psycopg2
            print("Connection: PASS")
            
            # Simple auth and connection verify
            res = conn.execute(text("SELECT 1"))
            res.scalar()
            print("Authentication: PASS")
            
            # Check for tables
            tables_query = "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
            tables = [row[0] for row in conn.execute(text(tables_query))]
            
            required = ["research_papers", "paper_sources", "datasets", "dataset_sources"]
            missing = [t for t in required if t not in tables]
            
            if not missing:
                print("Tables: PASS")
                print("\nDatabase status: READY")
            else:
                print("Tables: FAIL")
                print(f"Missing tables: {missing}")
                print("\nDatabase status: NOT READY (Run db/init_db.py)")
                
    except Exception as e:
        print("Connection: FAIL")
        print("\nERROR: PostgreSQL is not reachable.")
        print("Please verify:")
        print(" 1. PostgreSQL is installed.")
        print(" 2. PostgreSQL service is running.")
        print(" 3. DATABASE_URL is correct.")
        print(" 4. Database knowledge_base exists.")
        print(" 5. User credentials are correct.")
        print(f"\nDetails: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    check_db()
