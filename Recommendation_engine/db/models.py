from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone

Base = declarative_base()

class ResearchPaper(Base):
    __tablename__ = 'research_papers'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(Text, index=True)
    abstract = Column(Text, nullable=True)
    authors = Column(JSON, nullable=True)
    publication_year = Column(Integer, nullable=True, index=True)
    venue = Column(String, nullable=True)
    doi = Column(String, nullable=True, index=True)
    paper_url = Column(String, nullable=True)
    publisher_url = Column(String, nullable=True)
    open_access_url = Column(String, nullable=True)
    pdf_url = Column(String, nullable=True)
    is_open_access = Column(Boolean, default=False)
    citation_count = Column(Integer, default=0)
    keywords = Column(JSON, nullable=True)
    topics = Column(JSON, nullable=True)
    domain = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    sources = relationship("PaperSource", back_populates="paper", cascade="all, delete-orphan")

class PaperSource(Base):
    __tablename__ = 'paper_sources'

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey('research_papers.id'), index=True)
    source_name = Column(String, index=True)
    source_id = Column(String, index=True)
    last_source_update = Column(DateTime, nullable=True)

    paper = relationship("ResearchPaper", back_populates="sources")

class Dataset(Base):
    __tablename__ = 'datasets'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, index=True)
    description = Column(Text, nullable=True)
    domain = Column(String, nullable=True, index=True)
    keywords = Column(JSON, nullable=True)
    features = Column(JSON, nullable=True)
    geographic_scope = Column(String, nullable=True)
    size_description = Column(String, nullable=True)
    format = Column(String, nullable=True)
    license = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    access_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    sources = relationship("DatasetSource", back_populates="dataset", cascade="all, delete-orphan")

class DatasetSource(Base):
    __tablename__ = 'dataset_sources'

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey('datasets.id'), index=True)
    source_name = Column(String, index=True)
    source_id = Column(String, index=True)
    last_source_update = Column(DateTime, nullable=True)

    dataset = relationship("Dataset", back_populates="sources")
