import os
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from api_repository import KnowledgeBaseRepository
from embeddings.service import EmbeddingService, IndexLoader
from retrieval.models import ProblemDef, RetrievedCandidate, RetrievalResult
from retrieval.text_builder import build_problem_embedding_text

logger = logging.getLogger(__name__)

class RetrievalEngine:
    def __init__(self, db: Session, k: int = 20):
        self.k = k
        self.repo = KnowledgeBaseRepository(db)
        
        # Must strictly use the existing MiniLM-L6-v2 Service
        self.embedding_service = EmbeddingService(model_name=os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2"))
        
        # Load indexes natively through Module 2 conventions
        default_index_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "indexes")
        self.loader = IndexLoader(index_dir=os.getenv("INDEX_DIR", default_index_dir))
        
        try:
            self.paper_index, self.paper_mapping = self.loader.load_index("papers")
            self.dataset_index, self.dataset_mapping = self.loader.load_index("datasets")
        except Exception as e:
            logger.error("Failed to load FAISS indexes. Are you sure Module 2 was run?", exc_info=True)
            raise RuntimeError(f"Missing or corrupted FAISS indexes: {e}")
            
        # Hardware sanity check validation
        expected_dim = self.embedding_service.dimension
        if getattr(self.paper_index, 'd', expected_dim) != expected_dim:
            raise ValueError(f"Paper Index Dimension mismatch: Index={self.paper_index.d}, Model={expected_dim}")
            
        if getattr(self.dataset_index, 'd', expected_dim) != expected_dim:
            raise ValueError(f"Dataset Index Dimension mismatch: Index={self.dataset_index.d}, Model={expected_dim}")

    def retrieve(self, problem: ProblemDef) -> RetrievalResult:
        # 1. Text Formulation
        semantic_text = build_problem_embedding_text(problem)
        if not semantic_text:
            raise ValueError(f"Problem {problem.problem_id} produced no valid semantic text.")
            
        # 2. Embedding generation (Same model, L2-normalized implicitly matching IndexFlatIP requirements)
        # We pass batch_size=1 since we are only doing one problem
        problem_matrix = self.embedding_service.generate_embeddings([semantic_text], batch_size=1)
        
        # Ensure we always get standard exact dimension natively
        if problem_matrix.shape[1] != self.embedding_service.dimension:
            raise ValueError(f"Dim mismatch during generation: got {problem_matrix.shape[1]}")

        result = RetrievalResult(problem=problem)
        
        # 3. Retrieve Papers
        if self.paper_index.ntotal > 0:
            k_p = min(self.k, self.paper_index.ntotal)
            distances, faiss_positions = self.paper_index.search(problem_matrix, k_p)
            
            for i in range(k_p):
                score = float(distances[0][i])
                pos = int(faiss_positions[0][i])
                
                if pos == -1:
                    continue
                    
                db_id = self.paper_mapping[pos]["database_id"]
                paper = self.repo.get_research_paper_by_id(db_id)
                
                if not paper:
                    logger.warning(f"Orphaned FAISS paper position {pos} -> DB ID {db_id}")
                    continue
                    
                candidate = RetrievedCandidate(
                    database_id=db_id,
                    faiss_position=pos,
                    similarity_score=score,
                    metadata={
                        "id": paper.id,
                        "title": paper.title,
                        "abstract": paper.abstract,
                        "authors": paper.authors,
                        "publication_year": paper.publication_year,
                        "venue": paper.venue,
                        "doi": paper.doi,
                        "paper_url": paper.paper_url,
                        "publisher_url": paper.publisher_url,
                        "open_access_url": paper.open_access_url,
                        "pdf_url": paper.pdf_url,
                        "is_open_access": paper.is_open_access,
                        "citation_count": paper.citation_count,
                        "keywords": paper.keywords,
                        "topics": paper.topics,
                        "domain": paper.domain
                    }
                )
                result.papers.append(candidate)
                
        # 4. Retrieve Datasets
        if self.dataset_index.ntotal > 0:
            k_d = min(self.k, self.dataset_index.ntotal)
            distances, faiss_positions = self.dataset_index.search(problem_matrix, k_d)
            
            for i in range(k_d):
                score = float(distances[0][i])
                pos = int(faiss_positions[0][i])
                
                if pos == -1:
                    continue
                    
                db_id = self.dataset_mapping[pos]["database_id"]
                dataset = self.repo.get_dataset_by_id(db_id)
                
                if not dataset:
                    logger.warning(f"Orphaned FAISS dataset position {pos} -> DB ID {db_id}")
                    continue
                    
                candidate = RetrievedCandidate(
                    database_id=db_id,
                    faiss_position=pos,
                    similarity_score=score,
                    metadata={
                        "id": dataset.id,
                        "name": dataset.name,
                        "description": dataset.description,
                        "domain": dataset.domain,
                        "keywords": dataset.keywords,
                        "features": dataset.features,
                        "geographic_scope": dataset.geographic_scope,
                        "size_description": dataset.size_description,
                        "format": dataset.format,
                        "license": dataset.license,
                        "source_url": dataset.source_url,
                        "access_url": dataset.access_url
                    }
                )
                result.datasets.append(candidate)
                
        return result
