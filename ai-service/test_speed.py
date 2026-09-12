import asyncio
import time
import httpx
from app.config import settings

async def test_speed():
    headers = {
        "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
        "Content-Type": "application/json",
    }
    
    schema = (
        '{"domain":"Water and Sanitation","subdomain":"Rural Water Supply","category":"Infrastructure",'
        '"summary":"Brief summary","required_technologies":["Water Filtration","IoT Telemetry"],'
        '"keywords":["drinking water","rural school"],"confidence":0.85}'
    )
    prompt = (
        f"Return ONLY valid JSON matching schema:\n{schema}\n\n"
        "Title: Drinking-water shortages in rural government schools\n"
        "Description: Several government schools in a rural area are facing frequent drinking-water shortages."
    )
    
    payload = {
        "model": "meta/llama-3.2-11b-vision-instruct",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.0,
        "max_tokens": 150,
        "response_format": {"type": "json_object"},
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        t0 = time.time()
        r1 = await client.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload)
        dt1 = time.time() - t0
        print(f"Req 1 (cold): {r1.status_code}, Elapsed: {dt1:.2f}s")
        
        t1 = time.time()
        r2 = await client.post("https://integrate.api.nvidia.com/v1/chat/completions", headers=headers, json=payload)
        dt2 = time.time() - t1
        print(f"Req 2 (warm): {r2.status_code}, Elapsed: {dt2:.2f}s")
        if r2.status_code == 200:
            print("Content:", r2.json()["choices"][0]["message"]["content"][:200])

if __name__ == "__main__":
    asyncio.run(test_speed())
