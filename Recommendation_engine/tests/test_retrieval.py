import pytest
import os
from retrieval import ProblemDef, build_problem_embedding_text

def test_build_problem_text_full():
    p = ProblemDef(
        problem_id="1",
        title="Predictive AI",
        description="Predict crops",
        domain="Agriculture",
        keywords=["AI", "Crops"]
    )
    result = build_problem_embedding_text(p)
    assert result == "Title: Predictive AI. Description: Predict crops. Keywords: AI, Crops. Domain: Agriculture."
    
def test_build_problem_text_partial():
    p = ProblemDef(
        problem_id="2",
        title="AI Only"
    )
    result = build_problem_embedding_text(p)
    assert result == "Title: AI Only."
    
def test_build_problem_text_empty():
    p = ProblemDef(problem_id="3")
    result = build_problem_embedding_text(p)
    assert result == ""
