from utils.normalization import normalize_title

def clean_text(text: str) -> str:
    if not text:
        return ""
    # reuse basic standardization but without aggressively lowercasing
    return " ".join(text.split())

def build_paper_embedding_text(paper) -> str:
    parts = []
    
    title = clean_text(paper.title)
    if title:
        parts.append(f"Title: {title}.")
        
    abstract = clean_text(paper.abstract)
    if abstract:
        parts.append(f"Abstract: {abstract}.")
        
    if paper.keywords:
        parts.append(f"Keywords: {', '.join(paper.keywords)}.")
        
    if paper.topics:
        parts.append(f"Topics: {', '.join(paper.topics)}.")
        
    domain = clean_text(paper.domain)
    if domain:
        parts.append(f"Domain: {domain}.")
        
    return " ".join(parts).strip()

def build_dataset_embedding_text(dataset) -> str:
    parts = []
    
    name = clean_text(dataset.name)
    if name:
        parts.append(f"Name: {name}.")
        
    description = clean_text(dataset.description)
    if description:
        parts.append(f"Description: {description}.")
        
    if dataset.keywords:
        parts.append(f"Keywords: {', '.join(dataset.keywords)}.")
        
    if dataset.features:
        parts.append(f"Features: {', '.join(dataset.features)}.")
        
    geo = clean_text(dataset.geographic_scope)
    if geo:
        parts.append(f"Geographic Scope: {geo}.")
        
    domain = clean_text(dataset.domain)
    if domain:
        parts.append(f"Domain: {domain}.")
        
    return " ".join(parts).strip()
