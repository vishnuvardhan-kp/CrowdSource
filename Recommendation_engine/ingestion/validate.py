import requests
from sqlalchemy.orm import Session
from db import get_db
from db.models import ResearchPaper, Dataset
import urllib.parse

def validate_url_syntax(url: str) -> bool:
    if not url:
        return False
    try:
        parsed = urllib.parse.urlparse(url)
        return all([parsed.scheme, parsed.netloc])
    except:
        return False

def check_url_live(url: str) -> str:
    if not validate_url_syntax(url):
        return "INVALID_SYNTAX"
    try:
        # short timeout, don't follow many redirects, just testing
        response = requests.head(url, timeout=5, allow_redirects=True)
        if response.status_code < 400:
            return "VALID"
        else:
            # fallback to GET for strict servers
            response_get = requests.get(url, timeout=5, stream=True)
            if response_get.status_code < 400:
                return "VALID"
            return f"HTTP_{response_get.status_code}"
    except requests.exceptions.Timeout:
        return "TIMEOUT"
    except requests.exceptions.ConnectionError:
        return "CONNECTION_ERROR"
    except Exception as e:
        return "ERROR"

def run_validation(db: Session, full_check: bool = False):
    papers = db.query(ResearchPaper).all()
    datasets = db.query(Dataset).all()
    
    invalid_paper_urls = 0
    missing_abstracts = 0
    
    print("--- VALIDATING PAPERS ---")
    for p in papers:
        urls = [p.paper_url, p.publisher_url, p.open_access_url, p.pdf_url]
        for u in urls:
            if u:
                if not validate_url_syntax(u):
                    invalid_paper_urls += 1
                    continue
                if full_check:
                    status = check_url_live(u)
                    if status != "VALID":
                        print(f"Paper ID {p.id} URL Issue: {u} -> {status}")
                
        if not p.abstract:
            missing_abstracts += 1
            
    invalid_ds_urls = 0
    missing_descriptions = 0
    
    print("--- VALIDATING DATASETS ---")
    for d in datasets:
        urls = [d.source_url, d.access_url]
        for u in urls:
            if u:
                if not validate_url_syntax(u):
                    invalid_ds_urls += 1
                    continue
                if full_check:
                    status = check_url_live(u)
                    if status != "VALID":
                        print(f"Dataset ID {d.id} URL Issue: {u} -> {status}")
                
        if not d.description:
            missing_descriptions += 1
            
    print("\n--- VALIDATION SUMMARY ---")
    print(f"Total Papers: {len(papers)}")
    print(f"Papers with missing abstracts: {missing_abstracts}")
    print(f"Papers with invalid URL syntax: {invalid_paper_urls}")
    print(f"Total Datasets: {len(datasets)}")
    print(f"Datasets with missing descriptions: {missing_descriptions}")
    print(f"Datasets with invalid URL syntax: {invalid_ds_urls}")
    
if __name__ == "__main__":
    db_session = next(get_db())
    # Setting full_check=False by default to avoid slow test runs, but configurable
    run_validation(db_session, full_check=False)
