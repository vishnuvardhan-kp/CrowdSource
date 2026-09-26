from sqlalchemy.orm import Session
from db.models import ResearchPaper, Dataset

class KnowledgeBaseRepository:
    """
    Clean interface exposed for Module 2.
    It guarantees that later modules NEVER rely on external APIs like OpenAlex or Semantic Scholar.
    All data is read directly from the PostgreSQL instance.
    """
    def __init__(self, db: Session):
        self.db = db

    def get_research_papers(self, skip: int = 0, limit: int = 100, domain: str = None):
        query = self.db.query(ResearchPaper)
        if domain:
            query = query.filter(ResearchPaper.domain == domain)
        return query.offset(skip).limit(limit).all()

    def get_research_paper_by_id(self, paper_id: int):
        return self.db.query(ResearchPaper).filter(ResearchPaper.id == paper_id).first()

    def get_datasets(self, skip: int = 0, limit: int = 100, domain: str = None):
        query = self.db.query(Dataset)
        if domain:
            query = query.filter(Dataset.domain == domain)
        return query.offset(skip).limit(limit).all()

    def get_dataset_by_id(self, dataset_id: int):
        return self.db.query(Dataset).filter(Dataset.id == dataset_id).first()
