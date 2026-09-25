from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List

from app.config import settings
from app.schemas import (
    AnalyzeChallengeRequest,
    ChallengeAiAnalysisResult,
    EmbeddingRequest,
    EmbeddingResponse,
    RerankRequest,
    RerankResponse,
    NormalizeCapabilitiesRequest,
    NormalizeCapabilitiesResponse,
    ReindexJobRequest,
    ReindexJobStatus,
    LanguageDetectionRequest,
    LanguageDetectionResponse,
    TranslateRequest,
    TranslateResponse,
    SupportedLanguage,
    SupportedLanguagesResponse,
    AnalyzeImageRelevanceRequest,
    ImageRelevanceResult,
)
from app.providers.factory import get_ai_provider
from app.taxonomy import normalize_capabilities_batch
from app.reindex import start_reindex_job, get_reindex_status

app = FastAPI(
    title="SamadhanSetu AI Problem Intelligence & Matching Service",
    version="1.0.0",
    description="Provider-agnostic AI inference microservice supporting NVIDIA NIM and deterministic mock providers.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    provider_type = settings.AI_PROVIDER.lower().strip()
    is_available = True
    status = "healthy"
    if provider_type == "nvidia" and not settings.NVIDIA_API_KEY:
        status = "degraded"
        is_available = False

    return {
        "status": status,
        "service": "samadhansetu-ai-service",
        "provider": settings.AI_PROVIDER,
        "provider_available": is_available,
        "configured_llm": settings.LLM_MODEL,
        "configured_embeddings": settings.EMBEDDING_MODEL,
        "configured_reranker": settings.RERANKER_MODEL,
        "taxonomy_version": settings.TAXONOMY_VERSION,
        "prompt_version": settings.PROMPT_VERSION,
    }

@app.get("/v1/ai/models")
def list_models():
    return {
        "provider": settings.AI_PROVIDER,
        "models": {
            "llm": {
                "name": settings.LLM_MODEL,
                "prompt_version": settings.PROMPT_VERSION,
            },
            "embedding": {
                "name": settings.EMBEDDING_MODEL,
                "dimensions": settings.EMBEDDING_DIMENSIONS,
                "version": "1.0",
            },
            "reranker": {
                "name": settings.RERANKER_MODEL,
            },
        },
    }

_challenge_analysis_cache: Dict[tuple, ChallengeAiAnalysisResult] = {}

@app.post("/v1/ai/analyze-challenge", response_model=ChallengeAiAnalysisResult)
async def analyze_challenge(request: AnalyzeChallengeRequest):
    cache_key = (request.title.strip(), request.description.strip())
    if cache_key in _challenge_analysis_cache:
        return _challenge_analysis_cache[cache_key]
    provider = get_ai_provider()
    result = await provider.analyze_challenge(request)
    if result.model_provider != "nvidia-fallback-mock" and result.confidence > 0:
        _challenge_analysis_cache[cache_key] = result
    return result

@app.post("/v1/ai/normalize-taxonomy", response_model=NormalizeCapabilitiesResponse)
def normalize_taxonomy(request: NormalizeCapabilitiesRequest):
    return normalize_capabilities_batch(
        request.extracted_capabilities,
        request.taxonomy,
    )

@app.post("/v1/ai/embeddings", response_model=EmbeddingResponse)
@app.post("/embeddings", response_model=EmbeddingResponse)
async def generate_embeddings(request: EmbeddingRequest):
    provider = get_ai_provider()
    result = await provider.generate_embeddings(
        texts=request.texts,
        model=request.model,
    )
    return result

@app.post("/v1/ai/rerank", response_model=RerankResponse)
async def rerank(request: RerankRequest):
    provider = get_ai_provider()
    result = await provider.rerank(
        query=request.query,
        candidates=request.candidates,
        top_n=request.top_n or 10,
        model=request.model,
    )
    return result

@app.post("/v1/ai/reindex/start", response_model=ReindexJobStatus)
def trigger_reindex(request: ReindexJobRequest):
    return start_reindex_job(request)

@app.get("/v1/ai/reindex/status/{job_id}", response_model=ReindexJobStatus)
def check_reindex(job_id: str):
    job = get_reindex_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Reindex job '{job_id}' not found")
    return job

# --- Multilingual Endpoints ---

JHARKHAND_SUPPORTED_LANGUAGES = [
    SupportedLanguage(
        code="en",
        name="English",
        native_name="English",
        script="Latin",
        ui_supported=True,
        ai_supported=True,
        requires_review_fallback=False,
    ),
    SupportedLanguage(
        code="hi",
        name="Hindi",
        native_name="हिन्दी",
        script="Devanagari",
        ui_supported=True,
        ai_supported=True,
        requires_review_fallback=False,
    ),
    SupportedLanguage(
        code="sat",
        name="Santali",
        native_name="ᱥᱟᱱᱛᱟᱲᱤ",
        script="Ol Chiki / Latin",
        ui_supported=True,
        ai_supported=True,
        requires_review_fallback=True,
    ),
    SupportedLanguage(
        code="nag",
        name="Nagpuri",
        native_name="नागपुरी",
        script="Devanagari",
        ui_supported=True,
        ai_supported=True,
        requires_review_fallback=True,
    ),
    SupportedLanguage(
        code="mun",
        name="Mundari",
        native_name="मुंडारी",
        script="Devanagari",
        ui_supported=True,
        ai_supported=True,
        requires_review_fallback=True,
    ),
    SupportedLanguage(
        code="kru",
        name="Kurukh",
        native_name="कुड़ुख़",
        script="Devanagari",
        ui_supported=True,
        ai_supported=True,
        requires_review_fallback=True,
    ),
    SupportedLanguage(
        code="kho",
        name="Khortha",
        native_name="खोरठा",
        script="Devanagari",
        ui_supported=True,
        ai_supported=True,
        requires_review_fallback=True,
    ),
    SupportedLanguage(
        code="sad",
        name="Sadri",
        native_name="सादरी",
        script="Devanagari",
        ui_supported=True,
        ai_supported=True,
        requires_review_fallback=True,
    ),
    SupportedLanguage(
        code="pan",
        name="Panchpargania",
        native_name="पंचपरगनिया",
        script="Devanagari",
        ui_supported=True,
        ai_supported=True,
        requires_review_fallback=True,
    ),
]

@app.get("/v1/ai/languages", response_model=SupportedLanguagesResponse)
def get_supported_languages():
    return SupportedLanguagesResponse(languages=JHARKHAND_SUPPORTED_LANGUAGES)

@app.post("/v1/ai/detect-language", response_model=LanguageDetectionResponse)
async def detect_language(request: LanguageDetectionRequest):
    provider = get_ai_provider()
    return await provider.detect_language(request.text)

@app.post("/v1/ai/translate", response_model=TranslateResponse)
async def translate_text(request: TranslateRequest):
    provider = get_ai_provider()
    return await provider.translate(
        text=request.text,
        source_language=request.source_language,
        target_language=request.target_language,
    )

@app.post("/v1/ai/analyze-image", response_model=ImageRelevanceResult)
async def analyze_image_relevance(request: AnalyzeImageRelevanceRequest):
    provider = get_ai_provider()
    return await provider.analyze_image_relevance(request)

