import asyncio
import httpx
from app.config import settings
from app.schemas import (
    AnalyzeChallengeRequest,
    RerankCandidate,
)
from app.providers.factory import get_ai_provider
from app.providers.mock import MockAIProvider
from app.providers.nvidia import NvidiaAIProvider

async def run_live_integration_test():
    print("============================================================")
    print(">> Starting Controlled NVIDIA AI Live Integration Test")
    print("============================================================\n")

    # 1. Inspect Environment & Provider
    print(f"[*] Configured AI_PROVIDER: {settings.AI_PROVIDER}")
    print(f"[*] Configured NVIDIA_BASE_URL: {settings.NVIDIA_BASE_URL}")
    print(f"[*] Configured LLM_MODEL: {settings.LLM_MODEL}")
    print(f"[*] Configured EMBEDDING_MODEL: {settings.EMBEDDING_MODEL}")
    print(f"[*] Configured RERANKER_MODEL: {settings.RERANKER_MODEL}")
    print(f"[*] Configured EMBEDDING_DIMENSIONS: {settings.EMBEDDING_DIMENSIONS}")
    
    # Check if key is populated without printing it
    has_key = bool(settings.NVIDIA_API_KEY and len(settings.NVIDIA_API_KEY.strip()) > 0)
    print(f"[*] NVIDIA_API_KEY populated: {has_key} (length: {len(settings.NVIDIA_API_KEY) if has_key else 0})")
    
    if not has_key:
        print("[!] Error: NVIDIA_API_KEY is not set in environment or .env file.")
        return False

    # 2. Test Direct Provider Resolution
    provider = get_ai_provider()
    print(f"[*] Active provider from factory: {provider.provider_name}")
    if provider.provider_name != "nvidia":
        print(f"[!] Warning: Factory returned {provider.provider_name} instead of nvidia.")
        provider = NvidiaAIProvider()

    # 3. Test Direct Raw Auth & LLM Call
    print("\n------------------------------------------------------------")
    print("[1/4] Testing NVIDIA LLM Inference...")
    print("------------------------------------------------------------")
    chal_req = AnalyzeChallengeRequest(
        challenge_id="live-test-001",
        title="Contaminated drinking water in village well",
        description="Villagers are reporting murky, foul-smelling tap water and gastrointestinal illnesses in block A.",
        district="Ranchi",
        state="Jharkhand",
        citizen_severity="SERIOUS",
    )

    try:
        analysis_result = await provider.analyze_challenge(chal_req)
        print(f"[+] LLM Provider Output: {analysis_result.model_provider}")
        print(f"[+] Extracted Category: {analysis_result.category}")
        print(f"[+] Extracted Sub-Category: {analysis_result.sub_category}")
        print(f"[+] Extracted Required Capabilities: {analysis_result.required_capabilities}")
        print(f"[+] Summary: {analysis_result.summary[:120]}...")
        print(f"[+] Confidence: {analysis_result.confidence}")
        print(f"[+] Severity Score: {analysis_result.severity_score}")
        if "fallback_reason" in analysis_result.raw_analysis:
            print(f"[!] LLM Call used fallback: {analysis_result.raw_analysis['fallback_reason']}")
            llm_ok = False
        else:
            llm_ok = True
            print("[OK] LLM model responded successfully via NVIDIA NIM.")
    except Exception as e:
        print(f"[!] LLM call failed with exception: {type(e).__name__}: {str(e)}")
        llm_ok = False

    # 4. Test Embedding Model
    print("\n------------------------------------------------------------")
    print("[2/4] Testing NVIDIA Embeddings...")
    print("------------------------------------------------------------")
    try:
        sample_texts = [
            "Groundwater filtration and hydraulic pipeline infrastructure",
            "Emergency healthcare transit and telemetry dispatch",
        ]
        emb_resp = await provider.generate_embeddings(sample_texts)
        print(f"[+] Embedding Provider: {emb_resp.model_provider}")
        print(f"[+] Model Name: {emb_resp.model_name}")
        print(f"[+] Returned Embeddings Count: {len(emb_resp.embeddings)}")
        if emb_resp.embeddings:
            first_dim = emb_resp.embeddings[0].dimensions
            print(f"[+] First Vector Dimensions: {first_dim} (Configured: {settings.EMBEDDING_DIMENSIONS})")
            if first_dim != settings.EMBEDDING_DIMENSIONS:
                print(f"[!] Dimensionality Note: Model returned {first_dim} dimensions vs configured {settings.EMBEDDING_DIMENSIONS}")
            emb_ok = True
            print("[OK] Embedding model responded successfully via NVIDIA NIM.")
        else:
            emb_ok = False
            print("[!] No embeddings returned.")
    except Exception as e:
        print(f"[!] Embedding call failed with exception: {type(e).__name__}: {str(e)}")
        emb_ok = False

    # 5. Test Reranker Model
    print("\n------------------------------------------------------------")
    print("[3/4] Testing NVIDIA Reranker...")
    print("------------------------------------------------------------")
    try:
        candidates = [
            RerankCandidate(id="cand-1", text="Civil engineering institute specializing in rural water pipeline repair"),
            RerankCandidate(id="cand-2", text="Software development agency building mobile payment apps"),
            RerankCandidate(id="cand-3", text="Environmental research lab with membrane filtration equipment"),
        ]
        rerank_resp = await provider.rerank(
            query="Water pipeline contamination and membrane filtration",
            candidates=candidates,
            top_n=3,
        )
        print(f"[+] Reranker Provider: {rerank_resp.model_provider}")
        print(f"[+] Model Name: {rerank_resp.model_name}")
        print(f"[+] Reranked Count: {len(rerank_resp.results)}")
        for r in rerank_resp.results:
            print(f"    - ID: {r.id}, Relevance Score: {r.relevance_score}, Text: {r.text[:60]}...")
        rerank_ok = True
        print("[OK] Reranker responded successfully via NVIDIA NIM.")
    except Exception as e:
        print(f"[!] Reranker call failed with exception: {type(e).__name__}: {str(e)}")
        rerank_ok = False

    # 6. Test MockAIProvider Independence
    print("\n------------------------------------------------------------")
    print("[4/4] Testing MockAIProvider Independence...")
    print("------------------------------------------------------------")
    mock_prov = MockAIProvider()
    mock_res = await mock_prov.analyze_challenge(chal_req)
    mock_emb = await mock_prov.generate_embeddings(["test"])
    mock_rerank = await mock_prov.rerank("test", candidates)
    mock_ok = (mock_res.model_provider == "mock" and len(mock_emb.embeddings) == 1 and len(mock_rerank.results) > 0)
    print(f"[OK] MockAIProvider operates independently and deterministically: {mock_ok}")

    print("\n============================================================")
    print("Live Integration Summary:")
    print(f"  - LLM Integration: {'PASS' if llm_ok else 'FAIL'}")
    print(f"  - Embeddings Integration: {'PASS' if emb_ok else 'FAIL'}")
    print(f"  - Reranker Integration: {'PASS' if rerank_ok else 'FAIL'}")
    print(f"  - Mock Provider Independence: {'PASS' if mock_ok else 'FAIL'}")
    print("============================================================\n")

    return llm_ok and emb_ok and rerank_ok and mock_ok

if __name__ == "__main__":
    asyncio.run(run_live_integration_test())
