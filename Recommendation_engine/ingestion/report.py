from sqlalchemy.orm import Session
from sqlalchemy import func
from db import get_db
from db.models import ResearchPaper, Dataset, PaperSource, DatasetSource

def generate_report(db: Session):
    total_papers = db.query(ResearchPaper).count()
    total_oa_papers = db.query(ResearchPaper).filter(ResearchPaper.open_access_url != None).count()
    papers_with_pdf = db.query(ResearchPaper).filter(ResearchPaper.pdf_url != None).count()
    papers_with_doi = db.query(ResearchPaper).filter(ResearchPaper.doi != None).count()
    
    paper_sources = db.query(PaperSource.source_name, func.count(PaperSource.id)).group_by(PaperSource.source_name).all()
    
    print("=== KNOWLEDGE BASE REPORT ===")
    print(f"Total Unique Papers: {total_papers}")
    print("Papers by source:")
    for source, count in paper_sources:
        print(f"  - {source}: {count}")
        
    print(f"Papers with DOI: {papers_with_doi}")
    print(f"Papers with open-access links: {total_oa_papers}")
    print(f"Papers with PDF links: {papers_with_pdf}")
    print("\n")
    
    total_datasets = db.query(Dataset).count()
    datasets_with_access = db.query(Dataset).filter(Dataset.access_url != None).count()
    datasets_with_license = db.query(Dataset).filter(Dataset.license != None).count()
    
    ds_sources = db.query(DatasetSource.source_name, func.count(DatasetSource.id)).group_by(DatasetSource.source_name).all()
    ds_domains = db.query(Dataset.domain, func.count(Dataset.id)).group_by(Dataset.domain).all()
    
    print(f"Total Unique Datasets: {total_datasets}")
    print("Datasets by source:")
    for source, count in ds_sources:
        print(f"  - {source}: {count}")
        
    print(f"Datasets with valid access URLs: {datasets_with_access}")
    print(f"Datasets with licenses: {datasets_with_license}")
    
    print("Datasets by domain:")
    for domain, count in ds_domains:
        print(f"  - {domain}: {count}")

if __name__ == "__main__":
    db_session = next(get_db())
    generate_report(db_session)
