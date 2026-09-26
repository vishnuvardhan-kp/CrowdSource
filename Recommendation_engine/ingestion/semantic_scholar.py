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

SEMANTIC_SCHOLAR_API_KEY = os.getenv("SEMANTIC_SCHOLAR_API_KEY")

class SemanticScholarIngestor:
    BASE_URL = "https://api.semanticscholar.org/graph/v1/paper/search"

    def __init__(self, db: Session, max_papers: int = 1000):
        self.db = db
        self.max_papers = max_papers
        self.headers = {}
        if SEMANTIC_SCHOLAR_API_KEY:
            self.headers["x-api-key"] = SEMANTIC_SCHOLAR_API_KEY
        self.checkpoint = CheckpointManager()

    def fetch_papers_by_domain(self, domain: str, limit: int = 100, start_offset: int = 0) -> tuple:
        results = []
        offset = start_offset
        per_page = 30
        
        while len(results) < limit:
            time.sleep(1) # SS has 1 req/sec without key
            params = {
                "query": domain,
                "offset": offset,
                "limit": per_page,
                "fields": "paperId,externalIds,title,abstract,authors,year,venue,url,openAccessPdf,isOpenAccess,citationCount,s2FieldsOfStudy"
            }
            try:
                response = requests.get(self.BASE_URL, headers=self.headers, params=params, timeout=10)
                if response.status_code == 429:
                    logging.warning("Semantic Scholar Rate limit reached. Backing off for 5s...")
                    time.sleep(5)
                    continue
                response.raise_for_status()
                data = response.json()
                items = data.get("data", [])
                if not items:
                    break
                
                results.extend(items)
                offset += per_page
            except Exception as e:
                logging.error(f"Error fetching Semantic Scholar papers for domain {domain}: {e}")
                break
                
        return results[:limit], offset

    def parse_paper(self, item: Dict[str, Any], domain: str) -> Optional[Dict[str, Any]]:
        title = item.get("title")
        if not title:
            return None

        authors = [a.get("name") for a in item.get("authors", []) if a.get("name")]
        
        external_ids = item.get("externalIds", {})
        doi = normalize_doi(external_ids.get("DOI", ""))
        
        is_oa = item.get("isOpenAccess", False)
        oa_pdf = item.get("openAccessPdf") or {}
        pdf_url = oa_pdf.get("url")

        topics = [f.get("category") for f in item.get("s2FieldsOfStudy", [])]

        return {
            "source_name": "Semantic Scholar",
            "source_id": item.get("paperId"),
            "paper_data": {
                "title": title,
                "abstract": item.get("abstract"),
                "authors": authors,
                "publication_year": item.get("year"),
                "venue": item.get("venue"),
                "doi": doi,
                "paper_url": item.get("url"),
                "publisher_url": item.get("url"),
                "open_access_url": pdf_url if is_oa else None,
                "pdf_url": pdf_url,
                "is_open_access": is_oa,
                "citation_count": item.get("citationCount", 0),
                "keywords": topics,
                "topics": topics,
                "domain": domain
            }
        }

    def ingest(self, mode: str = 'append', domains: List[str] = None):
        if not domains:
            domains = ["Agriculture", "Healthcare"]

        total_inserted = 0
        total_updated = 0
        total_skipped = 0
        per_domain_limit = max(1, self.max_papers // len(domains))

        for domain in domains:
            start_offset = self.checkpoint.get_progress("SemanticScholar_offset", domain) or 0
            logging.info(f"Fetching Semantic Scholar for domain: {domain} starting from offset {start_offset}")
            
            items, next_offset = self.fetch_papers_by_domain(domain, limit=per_domain_limit, start_offset=start_offset)
            
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

                # 1. Existing provenance
                existing_source = self.db.query(PaperSource).filter_by(source_name=source_name, source_id=source_id).first()
                existing_paper = existing_source.paper if existing_source else None

                # 2. De-dupe across domain (DOI)
                if not existing_paper and doi:
                    existing_paper = self.db.query(ResearchPaper).filter_by(doi=doi).first()
                
                # 3. De-dupe across domain (Title + Year)
                if not existing_paper and norm_title:
                    potential_matches = self.db.query(ResearchPaper).filter_by(publication_year=pub_year).all()
                    for pm in potential_matches:
                        if normalize_title(pm.title) == norm_title:
                            existing_paper = pm
                            break

                if existing_paper:
                    if mode == 'update':
                        # Update missing metadata conservatively
                        for k, v in paper_data.items():
                            if v and not getattr(existing_paper, k):
                                setattr(existing_paper, k, v)
                        existing_paper.updated_at = datetime.now(timezone.utc)
                        total_updated += 1
                    else:
                        total_skipped += 1
                        
                    # Add provenance pointer if new
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
                    self.db.flush()
                    
                    new_source = PaperSource(
                        paper_id=new_paper.id,
                        source_name=source_name,
                        source_id=source_id,
                        last_source_update=datetime.now(timezone.utc)
                    )
                    self.db.add(new_source)
                    self.db.commit()
                    total_inserted += 1

            self.checkpoint.set_progress("SemanticScholar_offset", domain, next_offset)

        logging.info(f"Semantic Scholar ingestion complete. Inserted: {total_inserted}, Updated: {total_updated}, Skipped: {total_skipped}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest from Semantic Scholar")
    parser.add_argument("--mode", choices=['append', 'update'], default='append')
    parser.add_argument("--max-papers", type=int, default=100)
    args = parser.parse_args()

    db_session = next(get_db())
    ingestor = SemanticScholarIngestor(db=db_session, max_papers=args.max_papers)
    ingestor.ingest(mode=args.mode, domains=["Agriculture", "Healthcare", "Water Resources"])
