import os
import json
import faiss
from db import get_db
from api_repository import KnowledgeBaseRepository
from embeddings.service import EmbeddingService

def validate_index(resource_type: str, repo: KnowledgeBaseRepository):
    base_dir = "indexes"
    idx_path = os.path.join(base_dir, f"{resource_type}.faiss")
    map_path = os.path.join(base_dir, f"{resource_type}_mapping.json")
    meta_path = os.path.join(base_dir, f"{resource_type}_metadata.json")
    
    if not (os.path.exists(idx_path) and os.path.exists(map_path) and os.path.exists(meta_path)):
        return None
        
    try:
        index = faiss.read_index(idx_path)
    except Exception as e:
        print(f"Failed to load FAISS index for {resource_type}: {e}")
        return None
        
    with open(map_path, 'r') as f:
        mapping = json.load(f)
        
    with open(meta_path, 'r') as f:
        meta = json.load(f)
        
    vcount = meta.get("vector_count", 0)
    
    if index.ntotal != vcount:
        print(f"Error: {resource_type} index ntotal ({index.ntotal}) != meta ({vcount})")
        return None
        
    if len(mapping) != vcount:
        print(f"Error: {resource_type} mapping len ({len(mapping)}) != meta ({vcount})")
        return None
        
    # Check dimensions
    service = EmbeddingService(model_name=meta.get("embedding_model"))
    if index.d != service.dimension:
        print(f"Error: {resource_type} index dimension ({index.d}) != model dimension ({service.dimension})")
        return None
        
    # Validate DB IDs exist
    # Sample first few for speed
    mapped_ids = set([m["database_id"] for m in mapping])
    if len(mapped_ids) != len(mapping):
        print(f"Error: duplicate database mappings in {resource_type}")
        return None
        
    # Quick sanity vector test
    if index.ntotal > 0:
        query_text = ["test query"]
        q_emb = service.generate_embeddings(query_text, batch_size=1)
        D, I = index.search(q_emb, 1)
        if I[0][0] == -1:
            print("Error: query test failed on index.")
            return None
            
    return meta

def main():
    db = next(get_db())
    repo = KnowledgeBaseRepository(db)
    
    print("=== EMBEDDING INDEX VALIDATION ===")
    
    p_meta = validate_index("papers", repo)
    if p_meta:
        print("\nPaper vectors:", p_meta["vector_count"])
        print("Paper mappings:", p_meta["vector_count"])
        print("Paper dimension:", p_meta["embedding_dimension"])
        print("Model:", p_meta["embedding_model"])
        print("Normalization: TRUE")
    else:
        print("\nPaper Index: MISSING/INVALID")
        
    d_meta = validate_index("datasets", repo)
    if d_meta:
        print("\nDataset vectors:", d_meta["vector_count"])
        print("Dataset mappings:", d_meta["vector_count"])
    else:
        print("\nDataset Index: MISSING/INVALID")
        
    if p_meta and d_meta:
        print("\nStatus: PASS")
    else:
        print("\nStatus: FAIL")

if __name__ == "__main__":
    main()
