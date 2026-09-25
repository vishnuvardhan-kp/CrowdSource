import os
import json
import numpy as np
import faiss
from embeddings.service import EmbeddingService, IndexBuilder, IndexLoader

def test_embedding_dimension():
    service = EmbeddingService(model_name="all-MiniLM-L6-v2")
    assert service.dimension == 384
    
    texts = ["Machine learning test"]
    emb = service.generate_embeddings(texts)
    assert emb.shape == (1, 384)
    # Check L2 norm is ~1
    norms = np.linalg.norm(emb, axis=1)
    assert np.allclose(norms, 1.0)
    
def test_index_build_and_load(tmp_path):
    # Setup temporary directory for index
    service = EmbeddingService()
    builder = IndexBuilder(service, index_dir=str(tmp_path))
    
    embeddings = np.random.randn(5, 384).astype(np.float32)
    faiss.normalize_L2(embeddings)
    
    mapping = [{"faiss_position": i, "database_id": i+100} for i in range(5)]
    builder.build_index("papers", embeddings, mapping)
    
    # Verify files created
    assert os.path.exists(os.path.join(tmp_path, "papers.faiss"))
    assert os.path.exists(os.path.join(tmp_path, "papers_mapping.json"))
    assert os.path.exists(os.path.join(tmp_path, "papers_metadata.json"))
    
    # Verify metadata
    with open(os.path.join(tmp_path, "papers_metadata.json"), 'r') as f:
        meta = json.load(f)
        assert meta["embedding_dimension"] == 384
        assert meta["vector_count"] == 5
        assert meta["normalized"] == True
        
    # Test Loading
    loader = IndexLoader(index_dir=str(tmp_path))
    idx, retrieved_mapping = loader.load_index("papers")
    assert idx.ntotal == 5
    assert len(retrieved_mapping) == 5
    
    db_ids = loader.resolve_ids([0, 2], retrieved_mapping)
    assert db_ids == [100, 102]
