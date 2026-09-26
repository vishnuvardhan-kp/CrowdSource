import os
from pathlib import Path
from pydantic_settings import BaseSettings

_BASE_DIR = Path(__file__).resolve().parent.parent
_ROOT_DIR = _BASE_DIR.parent

class Settings(BaseSettings):
    AI_PROVIDER: str = "nvidia"
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_API_KEY: str = ""
    
    LLM_MODEL: str = "meta/llama-3.2-11b-vision-instruct"
    EMBEDDING_MODEL: str = "nvidia/nemotron-3-embed-1b"
    RERANKER_MODEL: str = "nvidia/rerank-qa-mistral-4b"
    
    EMBEDDING_DIMENSIONS: int = 2048
    PROMPT_VERSION: str = "1.0.0"
    TAXONOMY_VERSION: str = "1.0.0"

    class Config:
        env_file = [
            str(_BASE_DIR / ".env"),
            str(_ROOT_DIR / ".env"),
            ".env",
        ]
        extra = "ignore"

settings = Settings()

# Ensure NVIDIA_API_KEY is clean of leading/trailing whitespace
if settings.NVIDIA_API_KEY:
    settings.NVIDIA_API_KEY = settings.NVIDIA_API_KEY.strip()
