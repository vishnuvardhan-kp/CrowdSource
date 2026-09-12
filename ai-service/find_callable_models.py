import asyncio
import httpx
from app.config import settings

async def find_callable_models():
    api_key = settings.NVIDIA_API_KEY
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get("https://integrate.api.nvidia.com/v1/models", headers=headers)
        if res.status_code != 200:
            print("Failed to get models")
            return
        
        models = [m["id"] for m in res.json().get("data", [])]
        print(f"Testing {len(models)} models for chat/completions and embeddings...")
        
        working_chat = []
        working_embed = []
        
        for m in models:
            # Test chat
            try:
                chat_res = await client.post(
                    "https://integrate.api.nvidia.com/v1/chat/completions",
                    headers=headers,
                    json={
                        "model": m,
                        "messages": [{"role": "user", "content": "hello"}],
                        "max_tokens": 5,
                    },
                )
                if chat_res.status_code == 200:
                    print(f"  [CHAT OK] {m}")
                    working_chat.append(m)
                elif chat_res.status_code != 404:
                    print(f"  [CHAT {chat_res.status_code}] {m}")
            except Exception:
                pass
                
            # Test embedding
            try:
                emb_res = await client.post(
                    "https://integrate.api.nvidia.com/v1/embeddings",
                    headers=headers,
                    json={
                        "model": m,
                        "input": ["test query"],
                    },
                )
                if emb_res.status_code == 200:
                    dim = len(emb_res.json()["data"][0]["embedding"])
                    print(f"  [EMBED OK] {m} (dims: {dim})")
                    working_embed.append((m, dim))
                elif emb_res.status_code != 404:
                    print(f"  [EMBED {emb_res.status_code}] {m}")
            except Exception:
                pass

        print("\nSummary of working models for your API key:")
        print("Chat models:", working_chat)
        print("Embedding models:", working_embed)

if __name__ == "__main__":
    asyncio.run(find_callable_models())
