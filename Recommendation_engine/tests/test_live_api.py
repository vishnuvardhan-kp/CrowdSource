import requests
import time

def test_live_recommendations():
    t0 = time.time()
    payload = {
        "problem_id": "TEST_CHALLENGE_WATER_01",
        "title": "Severe Water Contamination and Pipe Leakage in Urban Ward 12",
        "description": "Continuous sewage infiltration causing microbial outbreak and pipe pressure drops.",
        "domain": "Water Resources",
        "keywords": ["water contamination", "pipe leakage", "microbial outbreak", "sensor monitoring"],
        "top_n_papers": 5,
        "top_n_datasets": 5
    }
    r = requests.post("http://127.0.0.1:8001/v1/recommendations/research", json=payload, timeout=5)
    elapsed = (time.time() - t0) * 1000
    print(f"\nHTTP Status: {r.status_code} in {elapsed:.1f}ms")
    assert r.status_code == 200
    data = r.json()
    assert data["problem_id"] == "TEST_CHALLENGE_WATER_01"
    assert len(data["papers"]) == 5
    assert len(data["datasets"]) == 5
    print(f"Top Paper: {data['papers'][0]['title']} (Score: {data['papers'][0]['relevance_score']})")
    print(f"Score Breakdown: {data['papers'][0]['score_breakdown']}")
    print(f"Top Dataset: {data['datasets'][0]['name']} (Score: {data['datasets'][0]['relevance_score']})")

if __name__ == "__main__":
    test_live_recommendations()
