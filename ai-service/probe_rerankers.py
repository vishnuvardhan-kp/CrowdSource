import asyncio
import httpx
from app.config import settings

async def probe_rerankers():
    api_key = settings.NVIDIA_API_KEY
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    # Check model list and endpoints for reranking
    reranker_models = [
        "nvidia/rerank-qa-mistral-4b",
        "nvidia/llama-3.2-nv-rerankqa-1b-v1",
        "nvidia/reranking-mistral-7b"
    ]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        print("PROBING RERANKER MODELS / ENDPOINTS:")
        for m in reranker_models:
            try:
                res = await client.post(
                    "https://integrate.api.nvidia.com/v1/ranking",
                    headers=headers,
                    json={
                        "model": m,
                        "query": {"text": "drinking water contamination"},
                        "passages": [{"text": "water filtration and pipeline repair"}],
                    }
                )
                print(f"  Endpoint /v1/ranking with model {m} -> HTTP {res.status_code}")
                if res.status_code == 200:
                    print(f"    SUCCESS: {res.json()}")
                elif res.status_code != 404:
                    print(f"    Detail: {res.text[:200]}")
            except Exception as e:
                print(f"  Model: {m} -> Exception: {e}")

if __name__ == "__main__":
    asyncio.run(probe_rerankers())
