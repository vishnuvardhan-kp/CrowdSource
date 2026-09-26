import asyncio
from app.config import settings
from app.schemas import (
    AnalyzeChallengeRequest,
    NormalizeCapabilitiesRequest,
    EmbeddingRequest,
    RerankRequest,
    RerankCandidate,
    ReindexJobRequest,
)
from app.providers.factory import get_ai_provider
from app.providers.mock import MockAIProvider
from app.taxonomy import normalize_capabilities_batch
from app.reindex import start_reindex_job, get_reindex_status

async def test_ai_service():
    print("[TEST] Running AI Service Tests...")
    
    # 1. Provider Resolution & Mock Provider Verification
    provider = MockAIProvider()
    assert provider.provider_name == "mock"
    print("[PASS] MockAIProvider initialized successfully with provider_name 'mock'")

    # 2. Challenge Analysis
    req = AnalyzeChallengeRequest(
        challenge_id="chal-001",
        title="Severe pipeline contamination in Rampur",
        description="Villagers report murky drinking water and broken distribution pipe causing illness.",
        district="Varanasi",
        state="Uttar Pradesh",
        citizen_severity="SERIOUS",
    )
    analysis = await provider.analyze_challenge(req)
    assert analysis.category == "Water & Sanitation"
    assert "Water Purification" in analysis.required_capabilities
    assert analysis.severity_score >= 8.0
    assert analysis.confidence > 0.8
    assert analysis.model_provider == "mock"
    print(f"[PASS] Challenge analysis succeeded: {analysis.category} - {analysis.sub_category}")

    # 3. Taxonomy Normalization
    norm_req = NormalizeCapabilitiesRequest(
        extracted_capabilities=[
            "smart agricultural sensors",
            "Water Purification",
            "route optimization",
            "Unrecognized capability 12345",
        ]
    )
    norm_resp = normalize_capabilities_batch(norm_req.extracted_capabilities)
    assert len(norm_resp.results) == 4
    # Check alias match
    assert norm_resp.results[0].normalized_name == "Internet of Things (IoT)"
    assert norm_resp.results[0].confidence > 0.9
    # Check exact match
    assert norm_resp.results[1].normalized_name == "Water Purification & Filtration"
    # Check fallback for unrecognized
    assert norm_resp.results[3].requires_review is True
    print("[PASS] Taxonomy normalization verified (alias, exact, fallback with human review flag)")

    # 4. Embeddings Generation
    emb_req = EmbeddingRequest(texts=["Rural drinking water infrastructure", "Telemedicine routing"])
    emb_resp = await provider.generate_embeddings(emb_req.texts)
    assert len(emb_resp.embeddings) == 2
    assert emb_resp.dimensions == settings.EMBEDDING_DIMENSIONS
    assert len(emb_resp.embeddings[0].embedding) == settings.EMBEDDING_DIMENSIONS
    assert emb_resp.embeddings[0].text_hash is not None
    print(f"[PASS] Embeddings generation verified ({settings.EMBEDDING_DIMENSIONS}-dim deterministic vectors with hash)")

    # 5. Reranking
    candidates = [
        RerankCandidate(id="cand-1", text="Civil engineering company specializing in road asphalt"),
        RerankCandidate(id="cand-2", text="Environmental research lab with water filtration and hydraulic testing"),
        RerankCandidate(id="cand-3", text="Department of Computer Science with AI algorithms"),
    ]
    rerank_resp = await provider.rerank(
        query="water purification and hydraulic drainage pipe repairs",
        candidates=candidates,
        top_n=2,
    )
    assert len(rerank_resp.results) == 2
    assert rerank_resp.results[0].id == "cand-2"
    print(f"[PASS] Reranking verified (top match: {rerank_resp.results[0].id} score {rerank_resp.results[0].relevance_score})")

    # 6. Async Re-indexing Job
    reindex_req = ReindexJobRequest(target_embedding_model="nvidia/nv-embed-v2", target_dimensions=768)
    job = start_reindex_job(reindex_req)
    assert job.status == "pending"
    await asyncio.sleep(0.3)
    updated_job = get_reindex_status(job.job_id)
    assert updated_job is not None
    assert updated_job.status == "activated"
    assert updated_job.processed_entities == 50
    print(f"[PASS] Async re-indexing job lifecycle verified ({updated_job.status})")

    print("\n--- ALL AI SERVICE UNIT & INTEGRATION TESTS PASSED! ---\n")

if __name__ == "__main__":
    asyncio.run(test_ai_service())
