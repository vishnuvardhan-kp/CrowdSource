import hashlib
import re
from typing import List, Dict, Any, Optional
from .base import BaseAIProvider
from ..schemas import (
    AnalyzeChallengeRequest,
    ChallengeAiAnalysisResult,
    EmbeddingResponse,
    EmbeddingItem,
    RerankResponse,
    RerankResultItem,
    RerankCandidate,
    LanguageDetectionResponse,
    TranslateResponse,
)
from ..config import settings

class MockAIProvider(BaseAIProvider):
    """
    Deterministic Mock AI Provider for offline testing, CI/CD, and local development.
    Produces repeatable and valid structured outputs without making external network calls.
    """

    @property
    def provider_name(self) -> str:
        return "mock"

    async def analyze_challenge(self, request: AnalyzeChallengeRequest) -> ChallengeAiAnalysisResult:
        combined_text = f"{request.title} {request.description}".lower()

        # Deterministic domain & capability classification
        if any(w in combined_text for w in ["water", "drainage", "pipe", "drinking", "leak", "contamination"]):
            category = "Water & Sanitation"
            sub_category = "Clean Water Supply & Quality"
            problem_type = "Infrastructure & Resource Management"
            problem_factors = [
                "Contaminated or inadequate water distribution",
                "Aging pipeline infrastructure",
                "Absence of real-time water quality monitoring",
            ]
            required_capabilities = [
                "Water Purification",
                "IoT Sensor Networks",
                "Hydraulic Modeling",
                "Environmental Engineering",
            ]
            solution_domains = [
                "Water Infrastructure",
                "Smart Utilities",
                "Environmental Monitoring",
            ]
        elif any(w in combined_text for w in ["health", "hospital", "clinic", "ambulance", "doctor", "medicine", "emergency"]):
            category = "Healthcare"
            sub_category = "Emergency & Primary Care"
            problem_type = "Healthcare Access & Logistics"
            problem_factors = [
                "Long travel distance to healthcare facilities",
                "Lack of emergency medical transit",
                "Insufficient local diagnostic tools",
            ]
            required_capabilities = [
                "GIS & Spatial Mapping",
                "Route Optimization",
                "Telemedicine Systems",
                "Emergency Medical Protocols",
            ]
            solution_domains = [
                "Emergency Healthcare",
                "HealthTech",
                "Mobile Care Coordination",
            ]
        elif any(w in combined_text for w in ["farm", "crop", "agriculture", "pest", "soil", "harvest"]):
            category = "Agriculture"
            sub_category = "Crop Health & Yield"
            problem_type = "Agricultural Resilience"
            problem_factors = [
                "Pest outbreak vulnerability",
                "Lack of affordable soil health testing",
                "Unpredictable weather and irrigation stress",
            ]
            required_capabilities = [
                "Computer Vision",
                "Soil Science",
                "IoT Sensing",
                "Agronomy & Advisory",
            ]
            solution_domains = [
                "AgriTech",
                "Precision Farming",
                "Resource Conservation",
            ]
        elif any(w in combined_text for w in ["road", "traffic", "pothole", "transport", "bus", "commute"]):
            category = "Transportation"
            sub_category = "Urban & Rural Mobility"
            problem_type = "Road Infrastructure Quality"
            problem_factors = [
                "Damaged road surface posing safety risks",
                "Lack of automated damage detection",
                "Sub-optimal public transit schedules",
            ]
            required_capabilities = [
                "Computer Vision",
                "Civil Engineering",
                "Fleet Management",
                "Urban Planning",
            ]
            solution_domains = [
                "Smart Mobility",
                "Public Infrastructure",
            ]
        else:
            category = request.category or "General Community"
            sub_category = "Civic Infrastructure"
            problem_type = "Community Improvement"
            problem_factors = [
                "Resource allocation mismatch",
                "Lack of localized data collection",
                "Coordination gap between stakeholders",
            ]
            required_capabilities = [
                "Data Analytics",
                "Community Engagement Systems",
                "Software Engineering",
            ]
            solution_domains = [
                "Civic Tech",
                "Social Innovation",
            ]

        # Extract mock entities
        extracted_entities = {
            "locations": [request.village_locality, request.district, request.state] if request.district else ["Local Area"],
            "urgency_indicators": [request.citizen_severity] if request.citizen_severity else ["MODERATE"],
            "impacted_groups": [request.affected_population] if request.affected_population else ["Local residents"],
        }

        # Calculate deterministic severity score
        severity_score = 6.5
        if request.citizen_severity == "SERIOUS":
            severity_score = 8.5
        elif request.citizen_severity == "MODERATE":
            severity_score = 6.0
        elif request.citizen_severity == "NOT_SURE":
            severity_score = 4.5

        priority_score = min(10.0, severity_score + 0.5)

        # Generate topical keywords
        words = re.findall(r'\b[a-zA-Z]{4,}\b', f"{request.title} {request.description}")
        stop_words = {"this", "that", "with", "from", "have", "been", "were", "what", "their", "there", "about", "which", "would", "these", "other", "where", "area", "facing"}
        keywords = list(dict.fromkeys([w.title() for w in words if w.lower() not in stop_words]))[:6]
        if not keywords:
            keywords = [category, sub_category]

        summary = f"Identified civic need in {category} ({sub_category}). Primary challenge: {problem_type}. Key factors include {', '.join(problem_factors[:2])}."

        return ChallengeAiAnalysisResult(
            challenge_id=request.challenge_id,
            domain=category,
            subdomain=sub_category,
            category=problem_type,
            sub_category=sub_category,
            problem_type=problem_type,
            summary=summary,
            priority_score=round(priority_score, 2),
            severity_score=round(severity_score, 2),
            affected_population=request.affected_population or "Community residents",
            extracted_entities=extracted_entities,
            problem_factors=problem_factors,
            required_capabilities=required_capabilities,
            required_technologies=required_capabilities,
            keywords=keywords,
            solution_domains=solution_domains,
            confidence=0.88,
            model_provider="mock",
            model_name="mock-llama-3-70b",
            model_version="mock-v1",
            prompt_version=settings.PROMPT_VERSION,
            taxonomy_version=settings.TAXONOMY_VERSION,
            raw_analysis={
                "provider": "mock",
                "execution_mode": "offline_deterministic",
                "tokens_evaluated": len(combined_text.split()),
            },
        )

    async def generate_embeddings(
        self,
        texts: List[str],
        model: Optional[str] = None,
        dimensions: Optional[int] = None,
    ) -> EmbeddingResponse:
        dims = dimensions or settings.EMBEDDING_DIMENSIONS
        model_name = model or settings.EMBEDDING_MODEL
        items: List[EmbeddingItem] = []

        for idx, text in enumerate(texts):
            text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
            # Deterministic pseudo-embedding vector generated from sha256 hash digest
            hash_bytes = hashlib.sha512(text.encode("utf-8")).digest()
            vector: List[float] = []
            for i in range(dims):
                byte_val = hash_bytes[i % len(hash_bytes)]
                # Map to normalized float [-1.0, 1.0]
                val = ((byte_val / 255.0) * 2.0) - 1.0
                vector.append(round(val, 6))

            # Normalize vector to unit length
            norm = sum(x * x for x in vector) ** 0.5
            if norm > 0:
                vector = [round(x / norm, 6) for x in vector]

            items.append(
                EmbeddingItem(
                    index=idx,
                    text=text[:100] + ("..." if len(text) > 100 else ""),
                    text_hash=text_hash,
                    embedding=vector,
                    dimensions=dims,
                )
            )

        return EmbeddingResponse(
            model_provider="mock",
            model_name=model_name,
            model_version="mock-v1",
            embedding_version="v1.0",
            dimensions=dims,
            embeddings=items,
        )

    async def rerank(
        self,
        query: str,
        candidates: List[RerankCandidate],
        top_n: int = 10,
        model: Optional[str] = None,
    ) -> RerankResponse:
        query_words = set(re.findall(r"\w+", query.lower()))
        scored_results: List[RerankResultItem] = []

        for idx, cand in enumerate(candidates):
            cand_words = set(re.findall(r"\w+", cand.text.lower()))
            overlap = len(query_words.intersection(cand_words))
            # Mock relevance score based on token overlap with baseline
            base_score = 0.50
            relevance = min(0.99, base_score + (overlap * 0.08))

            scored_results.append(
                RerankResultItem(
                    index=idx,
                    id=cand.id,
                    relevance_score=round(relevance, 4),
                    text=cand.text,
                )
            )

        # Sort descending by relevance score
        scored_results.sort(key=lambda x: x.relevance_score, reverse=True)
        top_results = scored_results[:top_n]

        return RerankResponse(
            model_provider="mock",
            model_name=model or settings.RERANKER_MODEL,
            model_version="mock-v1",
            results=top_results,
        )

    async def detect_language(self, text: str) -> LanguageDetectionResponse:
        if not text or not text.strip():
            return LanguageDetectionResponse(
                language="en",
                confidence=1.0,
                script="Latin",
                is_supported=True,
                name="English",
            )

        trimmed = text.strip()

        # Check for Ol Chiki script (Santali unicode range \u1C50 - \u1C7F)
        if any("\u1c50" <= c <= "\u1c7f" for c in trimmed):
            return LanguageDetectionResponse(
                language="sat",
                confidence=0.98,
                script="Ol Chiki",
                is_supported=True,
                name="Santali",
            )

        # Check for Devanagari script (Unicode range \u0900 - \u097F)
        has_devanagari = any("\u0900" <= c <= "\u097f" for c in trimmed)
        if has_devanagari:
            # Check regional vocabulary markers
            lower_text = trimmed.lower()
            if any(k in trimmed for k in ["दिक्कत बा", "बड़ा दिक्कत", "हमार गांव", " नाखे", " आहे", "करत बा", "बा।", "बा "]):
                return LanguageDetectionResponse(
                    language="nag",
                    confidence=0.94,
                    script="Devanagari",
                    is_supported=True,
                    name="Nagpuri",
                )
            elif any(k in trimmed for k in ["हातु", "दाः", "मेनार", "बुरु"]):
                return LanguageDetectionResponse(
                    language="mun",
                    confidence=0.92,
                    script="Devanagari",
                    is_supported=True,
                    name="Mundari",
                )
            elif any(k in trimmed for k in ["अद्दो", "एर्पा", "उल्लस", "ईड़का"]):
                return LanguageDetectionResponse(
                    language="kru",
                    confidence=0.92,
                    script="Devanagari",
                    is_supported=True,
                    name="Kurukh",
                )
            elif any(k in trimmed for k in ["खेतवा", "पनिया", "भेलई", "हियै", "छौ"]):
                return LanguageDetectionResponse(
                    language="kho",
                    confidence=0.92,
                    script="Devanagari",
                    is_supported=True,
                    name="Khortha",
                )
            elif any(k in trimmed for k in ["रोरे", "तोरे", "रहेक"]):
                return LanguageDetectionResponse(
                    language="sad",
                    confidence=0.92,
                    script="Devanagari",
                    is_supported=True,
                    name="Sadri",
                )
            elif any(k in trimmed for k in ["आहा", "इहा", "आमार"]):
                return LanguageDetectionResponse(
                    language="pan",
                    confidence=0.92,
                    script="Devanagari",
                    is_supported=True,
                    name="Panchpargania",
                )
            else:
                return LanguageDetectionResponse(
                    language="hi",
                    confidence=0.97,
                    script="Devanagari",
                    is_supported=True,
                    name="Hindi",
                )

        # Check Latin-based regional indicators
        lower = trimmed.lower()
        if any(w in lower for w in ["hamaar", "hamar", "dikkat ba"]):
            return LanguageDetectionResponse(
                language="nag",
                confidence=0.90,
                script="Latin",
                is_supported=True,
                name="Nagpuri (Latin)",
            )
        elif any(w in lower for w in ["hatu", "mit'", "dare", "ale ature"]):
            return LanguageDetectionResponse(
                language="sat",
                confidence=0.90,
                script="Latin",
                is_supported=True,
                name="Santali (Latin)",
            )

        # Default to English
        return LanguageDetectionResponse(
            language="en",
            confidence=0.99,
            script="Latin",
            is_supported=True,
            name="English",
        )

    async def translate(
        self,
        text: str,
        source_language: Optional[str] = "auto",
        target_language: str = "en",
    ) -> TranslateResponse:
        if not text or not text.strip():
            return TranslateResponse(
                original_text=text,
                translated_text="",
                source_language=source_language or "en",
                target_language=target_language,
                confidence=1.0,
                provider="mock",
                model="deterministic-mock",
                requires_review=False,
            )

        # Determine source language if auto
        detected_lang = source_language
        if not detected_lang or detected_lang == "auto":
            det = await self.detect_language(text)
            detected_lang = det.language

        # If already in target language, identity mapping
        if detected_lang == target_language:
            return TranslateResponse(
                original_text=text,
                translated_text=text,
                source_language=detected_lang,
                target_language=target_language,
                confidence=1.0,
                provider="mock",
                model="deterministic-mock",
                requires_review=False,
            )

        # Failure / uncertain simulation hook for tests
        if "UNKNOWN_DIALECT" in text or "FAIL_TRANSLATION" in text or "UNRELIABLE" in text:
            return TranslateResponse(
                original_text=text,
                translated_text=None,
                source_language=detected_lang,
                target_language=target_language,
                confidence=0.35,
                provider="mock",
                model="deterministic-mock",
                requires_review=True,
                failure_reason="Language translation confidence below required quality threshold (0.35 < 0.75). Routed for human review.",
            )

        # Low-resource indigenous tribal languages safety policy:
        # Santali (sat), Kurukh (kru), and Mundari (mun) have lower confidence (< 0.75)
        # and require human review to prevent hallucination.
        if detected_lang in ["sat", "kru", "mun"]:
            return TranslateResponse(
                original_text=text,
                translated_text=None,
                source_language=detected_lang,
                target_language=target_language,
                confidence=0.60,
                provider="mock",
                model="deterministic-mock",
                requires_review=True,
                failure_reason=f"Low-resource language ({detected_lang}) confidence below 0.75 threshold. Routed for human reviewer validation to avoid hallucination.",
            )


        # Deterministic translations for representative test phrases
        trimmed = text.strip()
        translated_text = ""

        # Check water problem patterns
        if any(w in trimmed for w in ["पीने के पानी", "पानी की समस्या", "नल", "चापाकल", "हमार गांव में पानी", "ᱧᱩ ᱫᱟᱜ", "ᱫᱟᱜ ᱨᱮᱱᱟᱜ", "water", "drinking"]):
            translated_text = "Severe drinking water shortage in our village with dried up tube wells and lack of clean drinking water."
        # Check road/infrastructure patterns
        elif any(w in trimmed for w in ["सड़क", "रास्ता", "पुलिया", "डहर", "ᱦᱚᱨ", "road", "bridge"]):
            translated_text = "Damaged village road and broken bridge creating severe transportation blockages during rains."
        # Check health/medical patterns
        elif any(w in trimmed for w in ["अस्पताल", "दवा", "इलाज", "डॉक्टर", "ᱨᱩᱣᱟᱹ", "hospital", "clinic"]):
            translated_text = "Lack of primary healthcare center, doctor, and emergency medicine in the local block."
        # Check electricity/power patterns
        elif any(w in trimmed for w in ["बिजली", "ट्रांसफार्मर", "बिजली गुल", "electricity", "transformer"]):
            translated_text = "Burnt electric transformer causing power outages and darkness across the neighborhood for over two weeks."
        # Check agriculture/irrigation patterns
        elif any(w in trimmed for w in ["फसल", "सिंचाई", "कीड़ा", "खेती", "agriculture", "crop"]):
            translated_text = "Agricultural crop infestation and lack of irrigation canal water destroying regional harvest."
        else:
            # Standard generalized civic issue translation
            translated_text = f"Civic problem reported regarding local infrastructure: {trimmed[:200]}"

        # Preserve entity names if present
        for entity in ["Ranchi", "Kanke", "Sukhurhutu", "Bokaro", "Dhanbad", "Dumka", "Hazaribagh", "Jamshedpur"]:
            if entity.lower() in trimmed.lower() and entity not in translated_text:
                translated_text += f" located in {entity}"

        return TranslateResponse(
            original_text=text,
            translated_text=translated_text,
            source_language=detected_lang,
            target_language=target_language,
            confidence=0.95,
            provider="mock",
            model="deterministic-mock",
            requires_review=False,
        )

