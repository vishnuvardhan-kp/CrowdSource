import pytest
from reranking.config import PaperWeights, DatasetWeights
from reranking.scoring import calculate_keyword_score, calculate_domain_score, calculate_recency_score, calculate_citation_score, calculate_geographic_score
from retrieval.models import ProblemDef

def test_weights_validation():
    with pytest.raises(ValueError):
        PaperWeights(semantic=0.9, keyword=0.9)
    # Defaults should pass
    PaperWeights()
    DatasetWeights()

def test_calculate_keyword_score():
    p = ProblemDef(problem_id="1", title="Smart Agriculture", keywords=["IoT"])
    # "agriculture" "smart" "iot" (length 3 set)
    # candidate has "smart iot" -> overlap 2 -> 2/3 = 0.666
    score = calculate_keyword_score(p, ["Smart IoT devices"])
    assert abs(score - 0.666) < 0.01
    
def test_calculate_domain_score():
    assert calculate_domain_score("Agri", "agri") == 1.0
    assert calculate_domain_score("Agri", "Health") == 0.0
    assert calculate_domain_score(None, "agri") == 0.0

def test_calculate_recency_score():
    # age = 0
    assert calculate_recency_score(2026, current_year=2026) == 1.0
    # age = 10, e^(-1) ~ 0.367
    assert abs(calculate_recency_score(2016, current_year=2026, lmbda=0.1) - 0.367) < 0.01
    # missing
    assert calculate_recency_score(None) == 0.0
    
def test_calculate_citation_score():
    assert calculate_citation_score(0, 100) == 0.0
    assert calculate_citation_score(None, 100) == 0.0
    assert calculate_citation_score(10, 10) == 1.0
    
def test_calculate_geographic_score():
    p = ProblemDef(problem_id="1", title="Farms in Tamil Nadu")
    # "farms" "tamil" "nadu"
    assert calculate_geographic_score(p, "Data from Tamil Nadu") == 1.0
    assert calculate_geographic_score(p, "California") == 0.0
