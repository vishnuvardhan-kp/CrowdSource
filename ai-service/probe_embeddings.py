import asyncio
import httpx
from app.config import settings

async def probe_embeddings():
    api_key = settings.NVIDIA_API_KEY
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    embedding_models = [
        "nvidia/nv-embed-v1",
        "nvidia/embed-qa-4",
        "nvidia/llama-3.2-nv-embedqa-1b-v1",
        "nvidia/llama-nemotron-embed-vl-1b-v2",
        "nvidia/nemotron-3-embed-1b",
        "nvidia/nv-embedqa-mistral-7b-v2",
        "snowflake/arctic-embed-l",
        "meta/llama-3.2-11b-vision-instruct"
    ]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        print("PROBING EMBEDDING MODELS:")
        for m in embedding_models:
            try:
                res = await client.post(
                    "https://integrate.api.nvidia.com/v1/embeddings",
                    headers=headers,
                    json={
                        "model": m,
                        "input": ["Sample text about drinking water and sanitation infrastructure in rural districts."],
                    }
                )
                print(f"  Model: {m} -> HTTP {res.status_code}")
                if res.status_code == 200:
                    data = res.json()
                    vec = data["data"][0]["embedding"]
                    print(f"    SUCCESS: Vector Dimensions = {len(vec)}")
                elif res.status_code != 404:
                    print(f"    Detail: {res.text[:200]}")
            except Exception as e:
                print(f"  Model: {m} -> Exception: {e}")

if __name__ == "__main__":
    asyncio.run(probe_embeddings())
