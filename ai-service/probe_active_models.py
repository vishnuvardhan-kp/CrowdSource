import asyncio
import httpx
from app.config import settings

async def test_candidate_models():
    api_key = settings.NVIDIA_API_KEY
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Test LLM candidate: nvidia/llama-3.1-nemotron-70b-instruct or mistralai/mistral-large-2-instruct
        print("Testing LLM: nvidia/llama-3.1-nemotron-70b-instruct...")
        payload = {
            "model": "nvidia/llama-3.1-nemotron-70b-instruct",
            "messages": [
                {"role": "user", "content": "Respond with a short JSON: {\"status\": \"ok\"}"}
            ],
            "temperature": 0.2,
            "max_tokens": 100,
        }
        res = await client.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload)
        print(f"  Status: {res.status_code}")
        if res.status_code == 200:
            print(f"  Response: {res.json()['choices'][0]['message']['content']}")
            
        # 2. Test Embedding candidate: nvidia/nv-embedqa-mistral-7b-v2 or snowflake/arctic-embed-l
        print("\nTesting Embedding: nvidia/nv-embedqa-mistral-7b-v2...")
        emb_payload = {
            "input": ["Sample societal challenge text about water filtration"],
            "model": "nvidia/nv-embedqa-mistral-7b-v2",
            "input_type": "query",
        }
        emb_res = await client.post("https://integrate.api.nvidia.com/v1/embeddings", headers=headers, json=emb_payload)
        print(f"  Status: {emb_res.status_code}")
        if emb_res.status_code == 200:
            vec = emb_res.json()["data"][0]["embedding"]
            print(f"  Returned embedding vector dimension: {len(vec)}")
        else:
            print(f"  Embedding Error: {emb_res.text[:300]}")

        # 3. Test snowflake/arctic-embed-l
        print("\nTesting Embedding: snowflake/arctic-embed-l...")
        emb_payload2 = {
            "input": ["Sample societal challenge text about water filtration"],
            "model": "snowflake/arctic-embed-l",
        }
        emb_res2 = await client.post("https://integrate.api.nvidia.com/v1/embeddings", headers=headers, json=emb_payload2)
        print(f"  Status: {emb_res2.status_code}")
        if emb_res2.status_code == 200:
            vec2 = emb_res2.json()["data"][0]["embedding"]
            print(f"  Returned snowflake embedding vector dimension: {len(vec2)}")
        else:
            print(f"  Snowflake Embedding Error: {emb_res2.text[:300]}")

if __name__ == "__main__":
    asyncio.run(test_candidate_models())
