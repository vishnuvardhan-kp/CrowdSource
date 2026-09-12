from typing import Optional
from .base import BaseAIProvider
from .mock import MockAIProvider
from .nvidia import NvidiaAIProvider
from ..config import settings

_provider_instance: Optional[BaseAIProvider] = None

def get_ai_provider() -> BaseAIProvider:
    """
    Factory function resolving AIProvider based on environment configuration.
    Uses a singleton instance to maintain HTTP keep-alive connection pools.
    """
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    provider_type = settings.AI_PROVIDER.lower().strip()
    if provider_type == "nvidia":
        if not settings.NVIDIA_API_KEY:
            _provider_instance = MockAIProvider()
        else:
            _provider_instance = NvidiaAIProvider()
    else:
        _provider_instance = MockAIProvider()

    return _provider_instance
