import os
import argparse
import time
from db import get_db
from api_repository import KnowledgeBaseRepository
from embeddings.text_builder import build_paper_embedding_text, build_dataset_embedding_text
from embeddings.service import EmbeddingService, IndexBuilder

def report_stats(start_time, model_name, dim, p_total, p_emb, p_skip, d_total, d_emb, d_skip):
    end_time = time.time()
    elapsed = end_time - start_time
    
    print("\n=== EMBEDDING BUILD REPORT ===")
    print(f"Model: {model_name}\n")
    
    if p_total > 0:
        print("Papers:")
        print(f"Database records: {p_total}")
        print(f"Embedded: {p_emb}")
        print(f"Skipped: {p_skip}\n")
        
    if d_total > 0:
        print("Datasets:")
        print(f"Database records: {d_total}")
        print(f"Embedded: {d_emb}")
        print(f"Skipped: {d_skip}\n")
        
    print(f"Dimension: {dim}")
    if p_total > 0:
        print(f"Paper index: {p_emb} vectors")
    if d_total > 0:
        print(f"Dataset index: {d_emb} vectors")
        
    print(f"Total build time: {elapsed:.2f}s")
    print("Status: SUCCESS")


def main():
    parser = argparse.ArgumentParser(description="Build FAISS logic from KB.")
    parser.add_argument("--papers-only", action="store_true")
    parser.add_argument("--datasets-only", action="store_true")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--model", type=str, default="all-MiniLM-L6-v2")
    args = parser.parse_args()
    
    start_time = time.time()
    
    db = next(get_db())
    repo = KnowledgeBaseRepository(db)
    
    service = EmbeddingService(model_name=args.model)
    builder = IndexBuilder(service)
    
    p_total = p_emb = p_skip = 0
    d_total = d_emb = d_skip = 0
    
    do_papers = not args.datasets_only
    do_datasets = not args.papers_only
    
    if do_papers:
        papers = repo.get_research_papers(limit=100000) # get all realistically for SIH prototype
        p_total = len(papers)
        
        texts = []
        mapping = []
        faiss_pos = 0
        
        for p in papers:
            text = build_paper_embedding_text(p)
            if not text:
                p_skip += 1
                continue
            
            texts.append(text)
            mapping.append({
                "faiss_position": faiss_pos,
                "database_id": p.id
            })
            faiss_pos += 1
            
        if texts:
            embeddings = service.generate_embeddings(texts, batch_size=args.batch_size)
            builder.build_index("papers", embeddings, mapping)
            p_emb += len(texts)
            
    if do_datasets:
        datasets = repo.get_datasets(limit=100000)
        d_total = len(datasets)
        
        texts = []
        mapping = []
        faiss_pos = 0
        
        for d in datasets:
            text = build_dataset_embedding_text(d)
            if not text:
                d_skip += 1
                continue
            
            texts.append(text)
            mapping.append({
                "faiss_position": faiss_pos,
                "database_id": d.id
            })
            faiss_pos += 1
            
        if texts:
            embeddings = service.generate_embeddings(texts, batch_size=args.batch_size)
            builder.build_index("datasets", embeddings, mapping)
            d_emb += len(texts)
            
    report_stats(start_time, service.model_name, service.dimension, 
                 p_total, p_emb, p_skip, d_total, d_emb, d_skip)

if __name__ == "__main__":
    main()
