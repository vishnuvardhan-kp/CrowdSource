import asyncio
import httpx
from app.config import settings

async def find_all_available_models():
    api_key = settings.NVIDIA_API_KEY
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get("https://integrate.api.nvidia.com/v1/models", headers=headers)
        if res.status_code == 200:
            data = res.json()
            model_ids = sorted([m["id"] for m in data.get("data", [])])
            print("ALL AVAILABLE NVIDIA MODEL IDS:")
            for idx, mid in enumerate(model_ids):
                print(f"  [{idx+1}] {mid}")

if __name__ == "__main__":
    asyncio.run(find_all_available_models())
