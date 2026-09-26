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
    AnalyzeImageRelevanceRequest,
    ImageRelevanceResult,
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

    def _refine_problem_statement(self, request: AnalyzeChallengeRequest, category: str, sub_category: str) -> tuple[str, str, List[str], Dict[str, Any]]:
        text = f"{request.title} {request.description}".lower()

        # Build verified platform metadata (authoritative, not inferred from text)
        loc_parts = []
        if request.village_locality and request.village_locality.lower() not in ["unknown", "not specified"]:
            loc_parts.append(request.village_locality.strip())
        if request.district and request.district.lower() not in ["unknown", "not specified"]:
            loc_parts.append(request.district.strip())
        loc_suffix = ", ".join(loc_parts)

        platform_meta = {
            "verified_district": request.district if (request.district and request.district.lower() != "unknown") else None,
            "verified_locality": request.village_locality if (request.village_locality and request.village_locality.lower() != "unknown") else None,
            "verified_state": request.state if (request.state and request.state.lower() != "unknown") else None,
            "reported_severity": request.citizen_severity or None,
            "reported_affected_population": request.affected_population or None,
            "source": "PLATFORM_VERIFIED_CHALLENGE_METADATA",
        }

        # Case 1: Potable Water Scarcity (Hindi, Hinglish, English, Regional)
        if any(w in text for w in ["pani", "water", "drinking", "peene", "garmi", "sukha", "नल", "जल", "पानी", "daah"]):
            base_title = "Seasonal Potable Water Supply Scarcity in Rural Community"
            statement = "The local community experiences acute drinking water shortages during seasonal peak dry periods, leading to persistent household supply deficits."
            citizen_facts = [
                "Water supply unavailability or deficit reported during peak summer periods" if ("garmi" in text or "summer" in text) else "Disruption or deficit in local potable water supply",
                "Affects residential households and community water access",
            ]

        # Case 2: Waste Management / Garbage Accumulation (Mixed Language, Hinglish)
        elif any(w in text for w in ["garbage", "kachra", "waste", "safai", "dustbin", "dump", "कूड़ा", "refuse"]):
            base_title = "Irregular Solid Waste Collection Leading to Roadside Accumulation"
            statement = "Inconsistent municipal solid waste collection schedules have resulted in roadside waste accumulation, posing public sanitation and environmental cleanliness challenges in the locality."
            citizen_facts = [
                "Irregular municipal garbage collection schedules",
                "Accumulation of refuse along roadside corridors",
            ]

        # Case 3: Road Infrastructure / Structural Damage (Informal English, Hindi, etc.)
        elif any(w in text for w in ["road", "broken", "pothole", "gaddha", "sadak", "rasta", "highway", "commute", "सड़क"]):
            base_title = "Severe Road Surface Deterioration and Commuter Inconvenience"
            statement = "The local roadway infrastructure exhibits extensive structural damage and surface degradation, impeding safe vehicular transit and pedestrian mobility."
            citizen_facts = [
                "Road surface is damaged/broken",
                "Impedes commuter transit and community mobility",
            ]

        # Case 4: Healthcare Facility / Hospital Access
        elif any(w in text for w in ["hospital", "clinic", "health", "doctor", "aspatal", "swasthya", "medical", "dawa"]):
            base_title = "Healthcare Facility Operational and Accessibility Challenges"
            statement = "The community healthcare facility is experiencing operational, infrastructure, or service delivery constraints impacting local healthcare access."
            citizen_facts = [
                "Operational constraints reported at local healthcare facility",
                "Impacts community healthcare access and clinical service continuity",
            ]

        # Case 5: Regional / Tribal Language & Electrical Grid (Nagpuri, Santali, Mundari, Sadri)
        elif any(w in text for w in ["bijli", "electricity", "power", "grid", "transformer", "andhera", "current", "batti", "voltage", "blackout", "hamre", "toli", "ato"]):
            base_title = "Prolonged Electrical Grid Disruption and Power Supply Instability"
            statement = "The local settlement is experiencing extended electrical power outages and grid unreliability, disrupting evening illumination and domestic energy access."
            citizen_facts = [
                "Prolonged electrical outage reported in the locality",
                "Disruption of evening illumination and domestic power access",
            ]

        # Safe Default Civic Refinement (Strictly zero fabrication)
        else:
            clean_title = re.sub(r'[!?,.]+$', '', request.title.strip())
            words = clean_title.split()
            base_title = f"{clean_title.title()} Operational Challenges" if len(words) < 3 else clean_title.title()
            clean_desc = request.description.strip()
            statement = f"Local civic concern regarding {category.lower()} reported: {clean_desc}."
            citizen_facts = [
                f"Civic problem reported regarding {category}",
                f"Report details: {clean_desc[:120]}",
            ]

        # Professional Title: Append verified location suffix with em-dash ONLY when metadata exists
        if loc_suffix:
            final_title = f"{base_title} — {loc_suffix}"
        else:
            final_title = base_title

        return final_title, statement, citizen_facts, platform_meta

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
        prof_title, prof_stmt, citizen_facts, platform_meta = self._refine_problem_statement(request, category, sub_category)

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
            professional_title=prof_title,
            professional_problem_statement=prof_stmt,
            citizen_facts=citizen_facts,
            platform_metadata=platform_meta,
            key_facts=citizen_facts,
            refinement_status="REFINED",
            raw_analysis={
                "provider": "mock",
                "execution_mode": "offline_deterministic",
                "tokens_evaluated": len(combined_text.split()),
                "refinement_applied": True,
                "citizen_facts": citizen_facts,
                "platform_metadata": platform_meta,
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
            # Deterministic semantic pseudo-embedding vector generated from token hashes
            words = re.findall(r"[\w]+", text.lower())
            vector: List[float] = [0.0] * dims
            for w in words:
                if len(w) < 2:
                    continue
                h = int(hashlib.md5(w.encode("utf-8")).hexdigest(), 16)
                for i in range(4):
                    pos = (h >> (i * 16)) % dims
                    sign = 1.0 if ((h >> (i * 8)) & 1) else -1.0
                    vector[pos] += sign

            # Normalize vector to unit length
            norm = sum(x * x for x in vector) ** 0.5
            if norm > 0:
                vector = [round(x / norm, 6) for x in vector]
            else:
                vector = [0.0] * dims

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

    async def analyze_image_relevance(
        self,
        request: AnalyzeImageRelevanceRequest,
    ) -> ImageRelevanceResult:
        context_text = f"{request.title or ''} {request.description or ''}".lower()
        
        detected_features = []
        is_relevant = True
        confidence = 0.88
        
        if "water" in context_text or "pipe" in context_text or "drain" in context_text:
            detected_features = ["water body/leakage", "piping infrastructure", "civic terrain"]
            summary = "Image displays civic physical terrain consistent with water infrastructure or drainage challenges."
        elif "road" in context_text or "pothole" in context_text or "bridge" in context_text:
            detected_features = ["road surface damage", "pothole structure", "transportation corridor"]
            summary = "Image displays road surface distress and physical vehicular corridor consistent with reported transport defect."
        elif "crop" in context_text or "farm" in context_text or "agriculture" in context_text:
            detected_features = ["vegetation / cropland", "agricultural field", "foliage pattern"]
            summary = "Image displays agricultural cropland or field conditions consistent with reported farming challenge."
        else:
            detected_features = ["outdoor civic environment", "local physical infrastructure"]
            summary = "Image displays local environmental conditions broadly consistent with reported community context."

        return ImageRelevanceResult(
            is_relevant=is_relevant,
            confidence=confidence,
            visual_summary=summary,
            detected_features=detected_features,
            disclaimer="Advisory lightweight visual check for civic triage only. Not a legally binding or exhaustive forensic determination.",
        )

