from embeddings.text_builder import clean_text
from retrieval.models import ProblemDef

def build_problem_embedding_text(problem: ProblemDef) -> str:
    """
    Constructs a deterministic semantic string matching Module 2's indexing guidelines.
    """
    parts = []
    
    title = clean_text(problem.title)
    if title:
        parts.append(f"Title: {title}.")
        
    description = clean_text(problem.description)
    if description:
        parts.append(f"Description: {description}.")
        
    if problem.keywords:
        # Join cleaned keywords
        cleaned_kws = [clean_text(k) for k in problem.keywords if clean_text(k)]
        if cleaned_kws:
            parts.append(f"Keywords: {', '.join(cleaned_kws)}.")
            
    domain = clean_text(problem.domain)
    if domain:
        parts.append(f"Domain: {domain}.")
        
    return " ".join(parts).strip()
