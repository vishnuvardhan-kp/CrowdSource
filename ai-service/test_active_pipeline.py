import asyncio
import json
import re
import httpx
from app.config import settings

async def test_nemotron_and_vision():
    api_key = settings.NVIDIA_API_KEY
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    # 1. Test meta/llama-3.2-11b-vision-instruct
    print("Testing meta/llama-3.2-11b-vision-instruct for JSON Challenge Analysis...")
    prompt = (
        "Analyze this challenge and return ONLY JSON:\n"
        "Title: Contaminated well water\nDescription: Murky water causing sickness in village.\n"
        "JSON Schema:\n"
        '{"category": "Water & Sanitation", "sub_category": "Water Supply", "problem_type": "Water Pollution", "summary": "brief summary", "priority_score": 8.0, "severity_score": 7.5, "affected_population": "Villagers", "problem_factors": ["dirty well"], "required_capabilities": ["Water Purification"], "solution_domains": ["Water Tech"], "extracted_entities": {}, "confidence": 0.9}'
    )
    
    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers=headers,
            json={
                "model": "meta/llama-3.2-11b-vision-instruct",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1024,
                "temperature": 0.1,
            },
        )
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            content = res.json()["choices"][0]["message"]["content"]
            print(f"Content: {content[:300]}")
            # Try parse json
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
                print(f"[OK] Parsed JSON successfully: Category = {parsed.get('category')}")
            else:
                print("[!] Could not parse JSON")
                
        # 2. Test Embedding with nvidia/nemotron-3-embed-1b
        print("\nTesting nvidia/nemotron-3-embed-1b...")
        emb_res = await client.post(
            "https://integrate.api.nvidia.com/v1/embeddings",
            headers=headers,
            json={
                "model": "nvidia/nemotron-3-embed-1b",
                "input": ["Sample challenge text"],
            },
        )
        print(f"Status: {emb_res.status_code}")
        if emb_res.status_code == 200:
            vec = emb_res.json()["data"][0]["embedding"]
            print(f"[OK] Embedding dimension: {len(vec)}")

if __name__ == "__main__":
    asyncio.run(test_nemotron_and_vision())
