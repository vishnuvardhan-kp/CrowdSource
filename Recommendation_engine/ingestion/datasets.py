import requests
import time
import argparse
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from db import get_db
from db.models import Dataset, DatasetSource
from utils.normalization import normalize_title
from ingestion.checkpoint import CheckpointManager

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

DEFAULT_DATASET_DOMAINS = [
    "Education", "Public Datasets", "Community Datasets", "Government Data",
    "Social", "Economic", "Agriculture", "Environment", "Water", "Healthcare"
]

class DCAT_Ingestor:
    def __init__(self, db: Session, max_datasets: int = 100):
        self.db = db
        self.max_datasets = max_datasets
        # Broaden to include general open data catalogs offering wide domains
        self.dcat_urls = [
            ("New York Open Data", "https://data.ny.gov/data.json"),
            ("CDC Open Data", "https://data.cdc.gov/data.json"),
            ("Colorado Open Data", "https://data.colorado.gov/data.json")
        ]
        self.checkpoint = CheckpointManager()

    def fetch_datasets(self, url: str, domain: str, limit: int = 20, start_idx: int = 0) -> tuple:
        results = []
        current_idx = start_idx
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Use longer timeout for heavy JSON
                response = requests.get(url, timeout=30)
                response.raise_for_status()
                data = response.json()
                datasets = data.get("dataset", [])
                
                domain_lower = domain.lower()
                
                while len(results) < limit and current_idx < len(datasets):
                    ds = datasets[current_idx]
                    title = ds.get("title", "").lower()
                    desc = ds.get("description", "").lower()
                    keywords = [k.lower() for k in ds.get("keyword", [])]
                    
                    if domain_lower in title or domain_lower in desc or domain_lower in keywords:
                        results.append(ds)
                    
                    current_idx += 1
                
                # Success, break out of retry loop
                break
                
            except requests.exceptions.RequestException as e:
                logging.error(f"Network error fetching DCAT datasets for {domain} (Attempt {attempt+1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep((attempt + 1) * 5) # Backoff
            except Exception as e:
                logging.error(f"Unexpected error processing DCAT datasets for {domain}: {e}")
                break
                
        return results, current_idx

    def parse_dataset(self, item: Dict[str, Any], domain: str, source_name: str) -> Optional[Dict[str, Any]]:
        name = item.get("title")
        if not name:
            return None
        
        desc = item.get("description", "")
        keywords = item.get("keyword", [])
        
        distributions = item.get("distribution", [])
        access_url = distributions[0].get("accessURL") or distributions[0].get("downloadURL") if distributions else None
        dt_format = distributions[0].get("mediaType") if distributions else None

        return {
            "source_name": source_name,
            "source_id": item.get("identifier"),
            "dataset_data": {
                "name": name,
                "description": desc,
                "domain": domain,
                "keywords": keywords,
                "features": [],
                "geographic_scope": item.get("spatial"),
                "size_description": None,
                "format": dt_format,
                "license": item.get("license"),
                "source_url": item.get("landingPage"),
                "access_url": access_url
            }
        }

    def ingest(self, mode: str = 'append', domains: List[str] = None):
        if not domains:
            domains = DEFAULT_DATASET_DOMAINS

        total_inserted = 0
        total_updated = 0
        total_skipped = 0
        per_domain_limit = max(1, self.max_datasets // len(domains))

        for domain in domains:
            for source_title, url in self.dcat_urls:
                checkpoint_key = f"{source_title}_{domain}_idx"
                start_idx = self.checkpoint.get_progress(checkpoint_key, domain) or 0
                logging.info(f"Fetching {source_title} DCAT datasets for domain: {domain} starting from index {start_idx}")
                
                # To not over-saturate a single domain limit with just the first catalog
                items, next_idx = self.fetch_datasets(url, domain, limit=max(1, per_domain_limit//len(self.dcat_urls)), start_idx=start_idx)
                
                for item in items:
                    parsed = self.parse_dataset(item, domain, source_title)
                    if not parsed:
                        continue
                    
                    dataset_data = parsed["dataset_data"]
                    norm_name = normalize_title(dataset_data['name'])
                    source_name = parsed["source_name"]
                    source_id = parsed["source_id"]

                    existing_source = self.db.query(DatasetSource).filter_by(source_name=source_name, source_id=source_id).first()
                    existing_dataset = existing_source.dataset if existing_source else None

                    if not existing_dataset and norm_name:
                        potential_matches = self.db.query(Dataset).all()
                        for pm in potential_matches:
                            if normalize_title(pm.name) == norm_name:
                                existing_dataset = pm
                                break

                    if existing_dataset:
                        if mode == 'update':
                            for k, v in dataset_data.items():
                                if v and not getattr(existing_dataset, k):
                                    setattr(existing_dataset, k, v)
                            existing_dataset.updated_at = datetime.now(timezone.utc)
                            total_updated += 1
                        else:
                            total_skipped += 1
                            
                        if not existing_source:
                            new_source = DatasetSource(
                                dataset_id=existing_dataset.id,
                                source_name=source_name,
                                source_id=source_id,
                                last_source_update=datetime.now(timezone.utc)
                            )
                            self.db.add(new_source)
                        self.db.commit()
                    else:
                        new_ds = Dataset(**dataset_data)
                        self.db.add(new_ds)
                        self.db.flush()
                        
                        new_source = DatasetSource(
                            dataset_id=new_ds.id,
                            source_name=source_name,
                            source_id=source_id,
                            last_source_update=datetime.now(timezone.utc)
                        )
                        self.db.add(new_source)
                        self.db.commit()
                        total_inserted += 1

                self.checkpoint.set_progress(checkpoint_key, domain, next_idx)

        logging.info(f"Datasets ingestion complete. Inserted: {total_inserted}, Updated: {total_updated}, Skipped: {total_skipped}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest Datasets")
    parser.add_argument("--mode", choices=['append', 'update'], default='append')
    parser.add_argument("--max-datasets", type=int, default=100)
    args = parser.parse_args()

    db_session = next(get_db())
    ingestor = DCAT_Ingestor(db=db_session, max_datasets=args.max_datasets)
    ingestor.ingest(mode=args.mode, domains=DEFAULT_DATASET_DOMAINS)
