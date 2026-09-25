import os
import json
import faiss
import numpy as np
from datetime import datetime, timezone
from sentence_transformers import SentenceTransformer

class EmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = os.getenv("EMBEDDING_MODEL", model_name)
        # Load the sentence transformer model natively
        self.model = SentenceTransformer(self.model_name)
        
        # Expected embedding dimension based on the ST model
        self.dimension = self.model.get_sentence_embedding_dimension()
        
    def generate_embeddings(self, texts: list, batch_size: int = 32) -> np.ndarray:
        # Default normalize_embeddings=True makes cosine similarity == inner product
        embeddings = self.model.encode(texts, batch_size=batch_size, normalize_embeddings=True, show_progress_bar=True)
        return embeddings

class IndexBuilder:
    def __init__(self, service: EmbeddingService, index_dir: str = "indexes"):
        self.service = service
        self.index_dir = index_dir
        os.makedirs(self.index_dir, exist_ok=True)
        
    def build_index(self, resource_type: str, embeddings: np.ndarray, mapping: list):
        # We enforce normalized vectors, so flat inner product is perfect
        index = faiss.IndexFlatIP(self.service.dimension)
        index.add(embeddings)
        
        # Save temporary
        tmp_dir = os.path.join(self.index_dir, "tmp")
        os.makedirs(tmp_dir, exist_ok=True)
        
        tmp_index_path = os.path.join(tmp_dir, f"{resource_type}.faiss")
        tmp_mapping_path = os.path.join(tmp_dir, f"{resource_type}_mapping.json")
        tmp_meta_path = os.path.join(tmp_dir, f"{resource_type}_metadata.json")
        
        # write artifacts
        faiss.write_index(index, tmp_index_path)
        with open(tmp_mapping_path, 'w') as f:
            json.dump(mapping, f, indent=2)
            
        metadata = {
            "index_type": "IndexFlatIP",
            "embedding_model": self.service.model_name,
            "embedding_dimension": self.service.dimension,
            "normalized": True,
            "vector_count": len(embeddings),
            "source_table": "research_papers" if resource_type == "papers" else "datasets",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "version": "1"
        }
        with open(tmp_meta_path, 'w') as f:
            json.dump(metadata, f, indent=2)
            
        # Atomic switch
        os.replace(tmp_index_path, os.path.join(self.index_dir, f"{resource_type}.faiss"))
        os.replace(tmp_mapping_path, os.path.join(self.index_dir, f"{resource_type}_mapping.json"))
        os.replace(tmp_meta_path, os.path.join(self.index_dir, f"{resource_type}_metadata.json"))

class IndexLoader:
    def __init__(self, index_dir: str = "indexes"):
        self.index_dir = index_dir
        
    def load_index(self, resource_type: str):
        index_path = os.path.join(self.index_dir, f"{resource_type}.faiss")
        mapping_path = os.path.join(self.index_dir, f"{resource_type}_mapping.json")
        
        index = faiss.read_index(index_path)
        with open(mapping_path, 'r') as f:
            mapping = json.load(f)
            
        return index, mapping
        
    def resolve_ids(self, position_indices: list, mapping: list) -> list:
        database_ids = []
        for pos in position_indices:
            database_ids.append(mapping[pos]["database_id"])
        return database_ids
