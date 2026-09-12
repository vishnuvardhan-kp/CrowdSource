import asyncio
import httpx
from app.config import settings

async def discover_nvidia_models():
    api_key = settings.NVIDIA_API_KEY
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Query /v1/models
        try:
            res = await client.get("https://integrate.api.nvidia.com/v1/models", headers=headers)
            print(f"GET /v1/models status: {res.status_code}")
            if res.status_code == 200:
                data = res.json()
                model_ids = [m["id"] for m in data.get("data", [])]
                print(f"Total available models: {len(model_ids)}")
                
                # Check for llama, mistral, embeddings, rerank
                llms = [m for m in model_ids if "llama" in m.lower() or "mistral" in m.lower() or "nemotron" in m.lower()]
                embeds = [m for m in model_ids if "embed" in m.lower()]
                reranks = [m for m in model_ids if "rerank" in m.lower() or "rank" in m.lower()]
                
                print("\nSample LLM models:")
                for m in llms[:10]:
                    print(f"  - {m}")
                    
                print("\nSample Embedding models:")
                for m in embeds[:10]:
                    print(f"  - {m}")
                    
                print("\nSample Reranker models:")
                for m in reranks[:10]:
                    print(f"  - {m}")
            else:
                print(f"Response: {res.text[:300]}")
        except Exception as e:
            print(f"Error querying /v1/models: {e}")

if __name__ == "__main__":
    asyncio.run(discover_nvidia_models())
