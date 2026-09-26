import os
import requests
import time
import argparse
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from db import get_db
from db.models import ResearchPaper, PaperSource
from utils.normalization import normalize_doi, normalize_title
from ingestion.checkpoint import CheckpointManager

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

OPENALEX_API_KEY = os.getenv("OPENALEX_API_KEY")

DEFAULT_DOMAINS = [
    "Agriculture", "Healthcare", "Water Resources", "Environment",
    "Education", "Social Innovation", "Digital Platforms", "Crowdsourcing",
    "Citizen Science", "University-Industry Collaboration", "Collaborative Innovation",
    "Knowledge Sharing", "Technology Transfer", "Innovation Ecosystems",
    "Public Participation", "Challenge-Based Innovation", "EdTech",
    "Information Systems", "Community Development"
]

class OpenAlexIngestor:
    BASE_URL = "https://api.openalex.org/works"

    def __init__(self, db: Session, max_papers: int = 1000):
        self.db = db
        self.max_papers = max_papers
        self.headers = {"User-Agent": "mailto:test@example.com"}
        if OPENALEX_API_KEY:
            self.headers["Authorization"] = f"Bearer {OPENALEX_API_KEY}"
        self.checkpoint = CheckpointManager()

    def fetch_papers_by_domain(self, domain: str, limit: int = 100, start_page: int = 1) -> tuple:
        results = []
        page = start_page
        per_page = 50
        max_retries = 3
        
        while len(results) < limit:
            time.sleep(1.0) # Polite base delay
            params = {
                "search": domain,
                "per-page": per_page,
                "page": page,
                "filter": "has_abstract:true"
            }
            
            page_success = False
            items_found = True
            
            for attempt in range(max_retries):
                try:
                    response = requests.get(self.BASE_URL, headers=self.headers, params=params, timeout=15)
                    
                    if response.status_code == 429:
                        retry_after = (attempt + 1) * 10
                        try:
                            err_data = response.json()
                            if "retryAfter" in err_data:
                                retry_after = int(err_data["retryAfter"])
                        except Exception:
                            if "Retry-After" in response.headers:
                                retry_after = int(response.headers["Retry-After"])
                                
                        logging.warning(f"OpenAlex 429 Rate Limit hit for {domain}. Sleeping {retry_after}s... (Attempt {attempt+1}/{max_retries})")
                        time.sleep(retry_after)
                        continue
                        
                    response.raise_for_status()
                    data = response.json()
                    items = data.get("results", [])
                    
                    if not items:
                        items_found = False
                        
                    page_success = True
                    results.extend(items)
                    page += 1
                    break
                    
                except requests.exceptions.RequestException as e:
                    logging.error(f"Network error fetching OpenAlex papers for domain {domain} (Attempt {attempt+1}/{max_retries}): {e}")
                    if attempt < max_retries - 1:
                        time.sleep((attempt + 1) * 5)
                except Exception as e:
                    logging.error(f"Unexpected error processing OpenAlex for {domain}: {e}")
                    break
            
            if not page_success or not items_found:
                break
                
        return results[:limit], page

    def parse_paper(self, item: Dict[str, Any], domain: str) -> Optional[Dict[str, Any]]:
        title = item.get("title")
        if not title:
            return None

        abstract = ""
        inv_index = item.get("abstract_inverted_index")
        if inv_index:
            word_index_map = []
            for word, positions in inv_index.items():
                for pos in positions:
                    word_index_map.append((pos, word))
            word_index_map.sort(key=lambda x: x[0])
            abstract = " ".join([word for _, word in word_index_map])

        authors = []
        for authorship in item.get("authorships", []):
            author = authorship.get("author", {})
            aname = author.get("display_name")
            if aname:
                authors.append(aname)

        doi = normalize_doi(item.get("doi", ""))
        
        open_access = item.get("open_access", {})
        is_oa = open_access.get("is_oa", False)
        pdf_url = open_access.get("oa_url")
        open_access_url = pdf_url if is_oa else None

        primary_location = item.get("primary_location") or {}
        publisher_url = primary_location.get("landing_page_url")
        venue = primary_location.get("source", {}).get("display_name") if primary_location.get("source") else None
        concepts = [c.get("display_name") for c in item.get("concepts", []) if c.get("display_name")]

        return {
            "source_name": "OpenAlex",
            "source_id": item.get("id"),
            "paper_data": {
                "title": title,
                "abstract": abstract,
                "authors": authors,
                "publication_year": item.get("publication_year"),
                "venue": venue,
                "doi": doi,
                "paper_url": publisher_url or doi,
                "publisher_url": publisher_url,
                "open_access_url": open_access_url,
                "pdf_url": pdf_url,
                "is_open_access": is_oa,
                "citation_count": item.get("cited_by_count", 0),
                "keywords": concepts,
                "topics": concepts,
                "domain": domain
            }
        }


    def ingest(self, mode: str = 'append', domains: List[str] = None):
        if not domains:
            domains = DEFAULT_DOMAINS

        total_inserted = 0
        total_updated = 0
        total_skipped = 0
        per_domain_limit = max(1, self.max_papers // len(domains))

        for domain in domains:
            start_page = self.checkpoint.get_progress("OpenAlex_page", domain) or 1
            logging.info(f"Fetching OpenAlex for domain: {domain} starting from page {start_page}")
            
            items, next_page = self.fetch_papers_by_domain(domain, limit=per_domain_limit, start_page=start_page)
            
            for item in items:
                parsed = self.parse_paper(item, domain)
                if not parsed:
                    continue
                
                paper_data = parsed["paper_data"]
                norm_title = normalize_title(paper_data['title'])
                pub_year = paper_data['publication_year']
                doi = paper_data['doi']
                source_name = parsed["source_name"]
                source_id = parsed["source_id"]

                # 1. Check if provenance exists
                existing_source = self.db.query(PaperSource).filter_by(source_name=source_name, source_id=source_id).first()
                existing_paper = existing_source.paper if existing_source else None

                # 2. Check globally for deduplication
                if not existing_paper and doi:
                    existing_paper = self.db.query(ResearchPaper).filter_by(doi=doi).first()
                
                if not existing_paper and norm_title:
                    potential_matches = self.db.query(ResearchPaper).filter_by(publication_year=pub_year).all()
                    for pm in potential_matches:
                        if normalize_title(pm.title) == norm_title:
                            existing_paper = pm
                            break

                if existing_paper:
                    if mode == 'update':
                        # Update metadata conservatively
                        for k, v in paper_data.items():
                            if v and not getattr(existing_paper, k):
                                setattr(existing_paper, k, v)
                        existing_paper.updated_at = datetime.now(timezone.utc)
                        total_updated += 1
                    else:
                        total_skipped += 1
                    
                    # Ensure source link exists
                    if not existing_source:
                        new_source = PaperSource(
                            paper_id=existing_paper.id,
                            source_name=source_name,
                            source_id=source_id,
                            last_source_update=datetime.now(timezone.utc)
                        )
                        self.db.add(new_source)
                    self.db.commit()
                else:
                    new_paper = ResearchPaper(**paper_data)
                    self.db.add(new_paper)
                    self.db.flush() # get ID
                    
                    new_source = PaperSource(
                        paper_id=new_paper.id,
                        source_name=source_name,
                        source_id=source_id,
                        last_source_update=datetime.now(timezone.utc)
                    )
                    self.db.add(new_source)
                    self.db.commit()
                    total_inserted += 1

            self.checkpoint.set_progress("OpenAlex_page", domain, next_page)

        logging.info(f"OpenAlex ingestion complete. Inserted: {total_inserted}, Updated: {total_updated}, Skipped: {total_skipped}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest from OpenAlex")
    parser.add_argument("--mode", choices=['append', 'update'], default='append')
    parser.add_argument("--max-papers", type=int, default=100)
    args = parser.parse_args()

    db_session = next(get_db())
    ingestor = OpenAlexIngestor(db=db_session, max_papers=args.max_papers)
    ingestor.ingest(mode=args.mode, domains=DEFAULT_DOMAINS)
