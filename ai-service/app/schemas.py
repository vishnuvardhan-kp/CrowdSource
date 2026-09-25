from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# --- Challenge AI Analysis Schemas ---

class AnalyzeChallengeRequest(BaseModel):
    challenge_id: str
    title: str
    description: str
    category: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    village_locality: Optional[str] = None
    citizen_severity: Optional[str] = None
    affected_population: Optional[str] = None

class ChallengeAiAnalysisResult(BaseModel):
    challenge_id: str
    domain: Optional[str] = None
    subdomain: Optional[str] = None
    category: str
    sub_category: str
    problem_type: str
    summary: str
    priority_score: float
    severity_score: float
    affected_population: str
    extracted_entities: Dict[str, Any]
    problem_factors: List[str]
    required_capabilities: List[str]
    required_technologies: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    solution_domains: List[str]
    confidence: float
    model_provider: str
    model_name: str
    model_version: str
    prompt_version: str
    taxonomy_version: str
    professional_title: Optional[str] = None
    professional_problem_statement: Optional[str] = None
    citizen_facts: Optional[List[str]] = None
    platform_metadata: Optional[Dict[str, Any]] = None
    key_facts: Optional[List[str]] = None
    refinement_status: Optional[str] = "REFINED"
    raw_analysis: Dict[str, Any]

# --- Taxonomy Normalization Schemas ---

class CapabilityTaxonomyItem(BaseModel):
    id: str
    name: str
    slug: str
    category: str
    description: Optional[str] = None

class NormalizeCapabilitiesRequest(BaseModel):
    extracted_capabilities: List[str]
    taxonomy: Optional[List[CapabilityTaxonomyItem]] = None

class NormalizedCapability(BaseModel):
    original_term: str
    normalized_capability_id: Optional[str] = None
    normalized_name: str
    confidence: float
    method: str  # exact, alias, semantic, fallback
    requires_review: bool

class NormalizeCapabilitiesResponse(BaseModel):
    taxonomy_version: str
    results: List[NormalizedCapability]

# --- Embeddings Schemas ---

class EmbeddingRequest(BaseModel):
    texts: List[str]
    entity_type: Optional[str] = "challenge"  # challenge, organization, capability
    entity_id: Optional[str] = None
    model: Optional[str] = None

class EmbeddingItem(BaseModel):
    index: int
    text: str
    text_hash: str
    embedding: List[float]
    dimensions: int

class EmbeddingResponse(BaseModel):
    model_provider: str
    model_name: str
    model_version: str
    embedding_version: str
    dimensions: int
    embeddings: List[EmbeddingItem]

# --- Reranking Schemas ---

class RerankCandidate(BaseModel):
    id: str
    text: str
    metadata: Optional[Dict[str, Any]] = None

class RerankRequest(BaseModel):
    query: str
    candidates: List[RerankCandidate]
    top_n: Optional[int] = 10
    model: Optional[str] = None

class RerankResultItem(BaseModel):
    index: int
    id: str
    relevance_score: float
    text: str

class RerankResponse(BaseModel):
    model_provider: str
    model_name: str
    model_version: str
    results: List[RerankResultItem]

# --- Re-indexing Schemas ---

class ReindexJobRequest(BaseModel):
    target_embedding_model: str
    target_dimensions: int
    entity_types: Optional[List[str]] = ["challenge", "organization", "capability"]

class ReindexJobStatus(BaseModel):
    job_id: str
    status: str  # pending, in_progress, validating, activated, failed
    target_embedding_model: str
    target_dimensions: int
    total_entities: int
    processed_entities: int
    failed_entities: int
    started_at: str
    completed_at: Optional[str] = None
    error_message: Optional[str] = None

# --- Multilingual Problem Intelligence Schemas ---

class LanguageDetectionRequest(BaseModel):
    text: str

class LanguageDetectionResponse(BaseModel):
    language: str
    confidence: float
    script: Optional[str] = None
    is_supported: bool = True
    name: Optional[str] = None

class TranslateRequest(BaseModel):
    text: str
    source_language: Optional[str] = "auto"
    target_language: str = "en"

class TranslateResponse(BaseModel):
    original_text: str
    translated_text: Optional[str] = None
    source_language: str
    target_language: str
    confidence: float
    provider: str
    model: str
    requires_review: bool
    failure_reason: Optional[str] = None

class SupportedLanguage(BaseModel):
    code: str
    name: str
    native_name: str
    script: str
    ui_supported: bool
    ai_supported: bool
    requires_review_fallback: bool

class SupportedLanguagesResponse(BaseModel):
    languages: List[SupportedLanguage]

# --- Visual Evidence Relevance Check Schemas ---

class AnalyzeImageRelevanceRequest(BaseModel):
    challenge_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    image_base64: Optional[str] = None
    image_url: Optional[str] = None

class ImageRelevanceResult(BaseModel):
    is_relevant: bool
    confidence: float
    visual_summary: str
    detected_features: List[str]
    disclaimer: str = "Advisory lightweight visual check for civic triage only. Not a legally binding or exhaustive forensic determination."
