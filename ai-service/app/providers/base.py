from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from ..schemas import (
    AnalyzeChallengeRequest,
    ChallengeAiAnalysisResult,
    EmbeddingResponse,
    RerankResponse,
    RerankCandidate,
    LanguageDetectionResponse,
    TranslateResponse,
    AnalyzeImageRelevanceRequest,
    ImageRelevanceResult,
)

class BaseAIProvider(ABC):
    """
    Abstract Base Class for AI inference providers.
    Allows SamadhanSetu to decouple business logic from specific AI hosting environments.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g., 'nvidia', 'mock', 'openai')"""
        pass

    @abstractmethod
    async def analyze_challenge(self, request: AnalyzeChallengeRequest) -> ChallengeAiAnalysisResult:
        """
        Extracts structured problem intelligence from a citizen challenge:
        - domain, sub-domain, problem type
        - problem factors, constraints
        - affected population, entities
        - required capabilities, potential solution domains
        - severity signals and confidence scores
        """
        pass

    @abstractmethod
    async def generate_embeddings(
        self,
        texts: List[str],
        model: Optional[str] = None,
        dimensions: Optional[int] = None,
    ) -> EmbeddingResponse:
        """
        Generates vector representations with dimension and version metadata.
        """
        pass

    @abstractmethod
    async def rerank(
        self,
        query: str,
        candidates: List[RerankCandidate],
        top_n: int = 10,
        model: Optional[str] = None,
    ) -> RerankResponse:
        """
        Reranks candidate capabilities or organizations against a query challenge.
        """
        pass

    @abstractmethod
    async def detect_language(self, text: str) -> LanguageDetectionResponse:
        """
        Detects the natural language and script of the input text.
        """
        pass

    @abstractmethod
    async def translate(
        self,
        text: str,
        source_language: Optional[str] = "auto",
        target_language: str = "en",
    ) -> TranslateResponse:
        """
        Translates text from source language to target language.
        Returns confidence, review flags, and normalized content.
        """
        pass

    @abstractmethod
    async def analyze_image_relevance(
        self,
        request: AnalyzeImageRelevanceRequest,
    ) -> ImageRelevanceResult:
        """
        Performs lightweight advisory visual relevance check of uploaded evidence against problem context.
        """
        pass
