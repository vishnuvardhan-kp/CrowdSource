import asyncio
import httpx
from app.config import settings

async def probe_common_endpoints():
    api_key = settings.NVIDIA_API_KEY
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    # Try chat models
    test_models = [
        "meta/llama-3.1-70b-instruct",
        "meta/llama-3.2-11b-vision-instruct",
        "mistralai/mistral-large-2-instruct",
        "mistralai/mistral-7b-instruct-v0.3",
        "deepseek-ai/deepseek-v4-flash-0731",
        "ibm/granite-3.0-8b-instruct",
        "google/gemma-3-12b-it",
        "nvidia/llama-3.1-nemotron-70b-instruct"
    ]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        print("PROBING CHAT MODELS:")
        for m in test_models:
            try:
                res = await client.post(
                    "https://integrate.api.nvidia.com/v1/chat/completions",
                    headers=headers,
                    json={
                        "model": m,
                        "messages": [{"role": "user", "content": "hello"}],
                        "max_tokens": 10,
                    }
                )
                print(f"  Model: {m} -> HTTP {res.status_code}")
                if res.status_code == 200:
                    print(f"    SUCCESS: {res.json()['choices'][0]['message']['content'].strip()[:80]}")
                elif res.status_code != 404:
                    print(f"    Detail: {res.text[:200]}")
            except Exception as e:
                print(f"  Model: {m} -> Exception: {e}")

if __name__ == "__main__":
    asyncio.run(probe_common_endpoints())
