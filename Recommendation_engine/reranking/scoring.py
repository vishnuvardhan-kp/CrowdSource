import math
import re
from typing import Set, List
from retrieval.models import ProblemDef

def tokenize(text: str) -> Set[str]:
    """Basic deterministic cleaner and tokenizer"""
    if not text:
        return set()
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    tokens = [t.strip() for t in text.split() if len(t.strip()) > 2]
    return set(tokens)

def calculate_keyword_score(problem: ProblemDef, candidate_strings: List[str]) -> float:
    problem_terms = tokenize(problem.title) | tokenize(problem.description)
    for kw in problem.keywords:
        problem_terms |= tokenize(kw)
        
    if not problem_terms:
        return 0.0
        
    candidate_terms = set()
    for s in candidate_strings:
        if s:
            candidate_terms |= tokenize(str(s))
            
    intersection = problem_terms & candidate_terms
    return min(1.0, float(len(intersection)) / float(len(problem_terms)))

def calculate_domain_score(problem_domain: str, candidate_domain: str) -> float:
    if not problem_domain or not candidate_domain:
        return 0.0
    if problem_domain.strip().lower() == candidate_domain.strip().lower():
        return 1.0
    return 0.0
    
def calculate_recency_score(publication_year: int, current_year: int = 2026, lmbda: float = 0.10) -> float:
    if not publication_year:
        return 0.0
    
    age = current_year - publication_year
    if age < 0:
        age = 0
        
    score = math.exp(-lmbda * age)
    return max(0.0, min(1.0, score))

def calculate_citation_score(citation_count: int, max_citations: int) -> float:
    if not citation_count or citation_count <= 0:
        return 0.0
    if not max_citations or max_citations <= 0:
        return 0.0
        
    score = math.log1p(citation_count) / math.log1p(max_citations)
    return max(0.0, min(1.0, score))

def calculate_geographic_score(problem: ProblemDef, dataset_geo: str) -> float:
    if not dataset_geo:
        return 0.0
        
    prob_terms = tokenize(problem.title) | tokenize(problem.description)
    geo_terms = tokenize(dataset_geo)
    
    if not geo_terms:
        return 0.0
        
    intersection = prob_terms & geo_terms
    if intersection:
        return 1.0
    return 0.0
