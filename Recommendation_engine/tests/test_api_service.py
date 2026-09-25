import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from service import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["embedding_dimension"] == 384
    assert data["paper_index_vectors"] == 1381
    assert data["dataset_index_vectors"] == 175
    assert data["database_connected"] is True

def test_recommendation_valid_request(client):
    payload = {
        "problem_id": "TEST_PROB_WATER_01",
        "title": "Severe Water Contamination and Microbial Seepage in Ward 12",
        "description": "High levels of fecal coliform and arsenic detected in local drinking water pipelines.",
        "domain": "Water Resources",
        "keywords": ["water contamination", "pipe leakage", "arsenic detection", "potable water distribution"],
        "top_n_papers": 5,
        "top_n_datasets": 5
    }
    response = client.post("/v1/recommendations/research", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["problem_id"] == "TEST_PROB_WATER_01"
    assert data["status"] == "success"
    assert len(data["papers"]) == 5
    assert len(data["datasets"]) == 5
    
    # Check paper structure
    p0 = data["papers"][0]
    assert "title" in p0
    assert "relevance_score" in p0
    assert "score_breakdown" in p0
    assert "semantic" in p0["score_breakdown"]
    assert "keyword" in p0["score_breakdown"]
    assert "domain" in p0["score_breakdown"]
    assert p0["relevance_score"] > 0
    
    # Check dataset structure
    d0 = data["datasets"][0]
    assert "name" in d0
    assert "relevance_score" in d0
    assert "score_breakdown" in d0
    assert "geographic" in d0["score_breakdown"]

def test_recommendation_partial_input(client):
    payload = {
        "problem_id": "TEST_PARTIAL_02",
        "title": "Crop Soil Health",
        "keywords": ["soil monitoring"]
    }
    response = client.post("/v1/recommendations/research", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["problem_id"] == "TEST_PARTIAL_02"
    assert len(data["papers"]) > 0

def test_recommendation_invalid_input(client):
    payload = {
        "title": "Missing ID Problem"
    }
    response = client.post("/v1/recommendations/research", json=payload)
    assert response.status_code == 422
