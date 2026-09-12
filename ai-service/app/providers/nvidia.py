import json
import hashlib
import httpx
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

class NvidiaAIProvider(BaseAIProvider):
    """
    Production NVIDIA AI Inference Provider communicating with NVIDIA OpenAI-compatible API.
    Supports hosted NIMs for LLM inference, Embeddings, and Reranking.
    """

    def __init__(self):
        self.base_url = settings.NVIDIA_BASE_URL.rstrip("/")
        self.api_key = settings.NVIDIA_API_KEY.strip()
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=45.0,
        )

    @property
    def provider_name(self) -> str:
        return "nvidia"

    async def analyze_challenge(self, request: AnalyzeChallengeRequest) -> ChallengeAiAnalysisResult:
        """
        Calls NVIDIA LLM (e.g. meta/llama-3.1-70b-instruct) via /v1/chat/completions
        with strict JSON mode prompt to extract structured problem intelligence.
        """
        system_prompt = (
            "Analyze the citizen challenge and return ONLY valid JSON matching this schema:\n"
            "{\n"
            '  "domain": "Societal domain (e.g. Water & Sanitation, Healthcare, Agriculture, Education)",\n'
            '  "subdomain": "Specific sub-domain (e.g. Drinking Water Supply, Rural Infrastructure)",\n'
            '  "category": "Infrastructural, technological, or systemic category",\n'
            '  "problem_type": "Specific nature of problem",\n'
            '  "summary": "Concise 1-2 sentence objective summary",\n'
            '  "priority_score": 8.0,\n'
            '  "severity_score": 8.0,\n'
            '  "affected_population": "Affected group description",\n'
            '  "problem_factors": ["Key root cause 1", "Key root cause 2"],\n'
            '  "required_technologies": ["Relevant technical capability 1", "Relevant technical capability 2"],\n'
            '  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4"],\n'
            '  "solution_domains": ["Solution domain 1", "Solution domain 2"],\n'
            '  "confidence": 0.85\n'
            "}"
        )

        user_content = (
            f"Title: {request.title}\n"
            f"Description: {request.description}\n"
            f"District: {request.district or 'Unknown'}, State: {request.state or 'Unknown'}\n"
            f"Locality: {request.village_locality or 'Unknown'}\n"
            f"Reported Severity: {request.citizen_severity or 'Not specified'}\n"
            f"Affected Population: {request.affected_population or 'Not specified'}"
        )

        payload = {
            "model": settings.LLM_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.0,
            "max_tokens": 220,
            "response_format": {"type": "json_object"},
        }

        try:
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            raw_content = data["choices"][0]["message"]["content"]
            
            # Robust JSON parsing (extract JSON object if wrapped in markdown codeblocks)
            import re
            json_match = re.search(r"\{.*\}", raw_content, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
            else:
                parsed = json.loads(raw_content)

            domain = parsed.get("domain") or parsed.get("category", request.category or "General")
            subdomain = parsed.get("subdomain") or parsed.get("sub_category", "General")
            category = parsed.get("category") or parsed.get("problem_type", "Societal Challenge")
            req_techs = parsed.get("required_technologies") or parsed.get("required_capabilities", [])
            keywords = parsed.get("keywords") or []

            return ChallengeAiAnalysisResult(
                challenge_id=request.challenge_id,
                domain=domain,
                subdomain=subdomain,
                category=category,
                sub_category=subdomain,
                problem_type=category,
                summary=parsed.get("summary") or request.description[:200],
                priority_score=float(parsed.get("priority_score") if parsed.get("priority_score") is not None else 5.0),
                severity_score=float(parsed.get("severity_score") if parsed.get("severity_score") is not None else 5.0),
                affected_population=parsed.get("affected_population") or request.affected_population or "Citizens",
                extracted_entities=parsed.get("extracted_entities") or {},
                problem_factors=parsed.get("problem_factors") or [],
                required_capabilities=req_techs,
                required_technologies=req_techs,
                keywords=keywords,
                solution_domains=parsed.get("solution_domains") or [],
                confidence=float(parsed.get("confidence") if parsed.get("confidence") is not None else 0.85),
                model_provider="nvidia",
                model_name=settings.LLM_MODEL,
                model_version="nim-v1",
                prompt_version=settings.PROMPT_VERSION,
                taxonomy_version=settings.TAXONOMY_VERSION,
                raw_analysis=parsed,
            )
        except Exception as e:
            # Safe degradation fallback if NVIDIA API fails or key is invalid
            from .mock import MockAIProvider
            fallback = MockAIProvider()
            result = await fallback.analyze_challenge(request)
            result.model_provider = "nvidia-fallback-mock"
            result.raw_analysis["fallback_reason"] = str(e)
            return result

    async def generate_embeddings(
        self,
        texts: List[str],
        model: Optional[str] = None,
        dimensions: Optional[int] = None,
    ) -> EmbeddingResponse:
        model_name = model or settings.EMBEDDING_MODEL
        dims = dimensions or settings.EMBEDDING_DIMENSIONS

        payload = {
            "input": texts,
            "model": model_name,
            "encoding_format": "float",
        }

        try:
            response = await self.client.post(
                f"{self.base_url}/embeddings",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            items: List[EmbeddingItem] = []
            for item in data.get("data", []):
                idx = item["index"]
                vec = item["embedding"]
                text = texts[idx] if idx < len(texts) else ""
                text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
                items.append(
                    EmbeddingItem(
                        index=idx,
                        text=text[:100],
                        text_hash=text_hash,
                        embedding=vec,
                        dimensions=len(vec),
                    )
                )

            return EmbeddingResponse(
                model_provider="nvidia",
                model_name=model_name,
                model_version="nim-v1",
                embedding_version="v1.0",
                dimensions=len(items[0].embedding) if items else dims,
                embeddings=items,
            )
        except Exception as e:
            from .mock import MockAIProvider
            fallback = MockAIProvider()
            result = await fallback.generate_embeddings(texts, model=model_name, dimensions=dims)
            result.model_provider = "nvidia-fallback-mock"
            return result

    async def rerank(
        self,
        query: str,
        candidates: List[RerankCandidate],
        top_n: int = 10,
        model: Optional[str] = None,
    ) -> RerankResponse:
        model_name = model or settings.RERANKER_MODEL
        payload = {
            "model": model_name,
            "query": {"text": query},
            "passages": [{"text": c.text} for c in candidates],
        }

        try:
            response = await self.client.post(
                f"{self.base_url}/ranking",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            results: List[RerankResultItem] = []
            for rank_item in data.get("rankings", []):
                idx = rank_item["index"]
                score = float(rank_item["logit"])
                cand = candidates[idx]
                results.append(
                    RerankResultItem(
                        index=idx,
                        id=cand.id,
                        relevance_score=score,
                        text=cand.text,
                    )
                )

            results.sort(key=lambda x: x.relevance_score, reverse=True)
            return RerankResponse(
                model_provider="nvidia",
                model_name=model_name,
                model_version="nim-v1",
                results=results[:top_n],
            )
        except Exception as e:
            from .mock import MockAIProvider
            fallback = MockAIProvider()
            result = await fallback.rerank(query, candidates, top_n=top_n, model=model_name)
            result.model_provider = "nvidia-fallback-mock"
            return result

    async def detect_language(self, text: str) -> LanguageDetectionResponse:
        """
        Detects language using NVIDIA NIM LLM with zero-shot identification.
        Falls back to MockAIProvider on failure or timeout.
        """
        if not text or not text.strip():
            return LanguageDetectionResponse(
                language="en",
                confidence=1.0,
                script="Latin",
                is_supported=True,
                name="English",
            )

        trimmed = text.strip()

        # Immediate fast path for Ol Chiki script (Santali unicode range \u1C50 - \u1C7F)
        if any("\u1c50" <= c <= "\u1c7f" for c in trimmed):
            return LanguageDetectionResponse(
                language="sat",
                confidence=0.99,
                script="Ol Chiki",
                is_supported=True,
                name="Santali",
            )

        system_prompt = (
            "You are a linguistic classifier specialized in the languages of Jharkhand and India.\n"
            "Identify the language of the following civic text.\n"
            "Supported language codes: 'en' (English), 'hi' (Hindi), 'sat' (Santali), 'nag' (Nagpuri), 'mun' (Mundari), 'kru' (Kurukh), 'kho' (Khortha), 'sad' (Sadri), 'pan' (Panchpargania).\n"
            "Return ONLY valid JSON in this exact format:\n"
            "{\n"
            '  "language": "hi",\n'
            '  "confidence": 0.95,\n'
            '  "script": "Devanagari",\n'
            '  "name": "Hindi"\n'
            "}"
        )

        payload = {
            "model": settings.LLM_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": trimmed[:500]},
            ],
            "temperature": 0.0,
            "max_tokens": 100,
            "response_format": {"type": "json_object"},
        }

        try:
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            raw_content = data["choices"][0]["message"]["content"]

            import re
            json_match = re.search(r"\{.*\}", raw_content, re.DOTALL)
            parsed = json.loads(json_match.group(0) if json_match else raw_content)

            lang = parsed.get("language", "hi").lower()
            conf = float(parsed.get("confidence", 0.90))
            script = parsed.get("script", "Devanagari")
            name = parsed.get("name", "Hindi")

            return LanguageDetectionResponse(
                language=lang,
                confidence=conf,
                script=script,
                is_supported=True,
                name=name,
            )
        except Exception:
            from .mock import MockAIProvider
            return await MockAIProvider().detect_language(text)

    async def translate(
        self,
        text: str,
        source_language: Optional[str] = "auto",
        target_language: str = "en",
    ) -> TranslateResponse:
        """
        Translates civic problem text to English using NVIDIA NIM LLM.
        Enforces strict preservation of location names, civic context, and entities.
        Marks low-resource/uncertain outputs as requires_review.
        """
        if not text or not text.strip():
            return TranslateResponse(
                original_text=text,
                translated_text="",
                source_language=source_language or "en",
                target_language=target_language,
                confidence=1.0,
                provider="nvidia",
                model=settings.LLM_MODEL,
                requires_review=False,
            )

        detected_lang = source_language
        if not detected_lang or detected_lang == "auto":
            det = await self.detect_language(text)
            detected_lang = det.language

        if detected_lang == target_language:
            return TranslateResponse(
                original_text=text,
                translated_text=text,
                source_language=detected_lang,
                target_language=target_language,
                confidence=1.0,
                provider="nvidia",
                model=settings.LLM_MODEL,
                requires_review=False,
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
                provider="nvidia",
                model=settings.LLM_MODEL,
                requires_review=True,
                failure_reason=f"Low-resource language ({detected_lang}) confidence below 0.75 threshold. Routed for human reviewer validation to avoid hallucination.",
            )


        system_prompt = (
            "You are an expert translator translating Indian civic grievances and community problem reports into official administrative English.\n"
            "Rules:\n"
            "1. Accurately convey the exact civic issue, severity, and urgency.\n"
            "2. Strictly preserve names of villages, wards, blocks, districts, landmarks, and individuals without alteration.\n"
            "3. Preserve all numerical quantities (e.g., 4 borewells, 15 days, 500 households, ₹10,000).\n"
            "4. Do NOT hallucinate extra facts or omit details.\n"
            "5. If the dialect is unintelligible, ambiguous, or cannot be translated with high confidence, set translated_text to null, confidence < 0.70, and requires_review to true.\n"
            "Return ONLY a JSON object:\n"
            "{\n"
            '  "translated_text": "Accurate English translation or null",\n'
            '  "confidence": 0.95,\n'
            '  "requires_review": false,\n'
            '  "failure_reason": null\n'
            "}"
        )

        payload = {
            "model": settings.LLM_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Source Language: {detected_lang}\nTarget Language: {target_language}\nOriginal Text: {text}",
                },
            ],
            "temperature": 0.0,
            "max_tokens": 350,
            "response_format": {"type": "json_object"},
        }

        try:
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            raw_content = data["choices"][0]["message"]["content"]

            import re
            json_match = re.search(r"\{.*\}", raw_content, re.DOTALL)
            parsed = json.loads(json_match.group(0) if json_match else raw_content)

            translated = parsed.get("translated_text")
            confidence = float(parsed.get("confidence", 0.85))
            requires_review = bool(parsed.get("requires_review", False)) or (confidence < 0.75) or (translated is None)
            failure_reason = parsed.get("failure_reason")

            return TranslateResponse(
                original_text=text,
                translated_text=translated if not requires_review else None,
                source_language=detected_lang,
                target_language=target_language,
                confidence=confidence,
                provider="nvidia",
                model=settings.LLM_MODEL,
                requires_review=requires_review,
                failure_reason=failure_reason if requires_review else None,
            )
        except Exception as e:
            # Fallback to Mock provider
            from .mock import MockAIProvider
            fallback_res = await MockAIProvider().translate(text, source_language=detected_lang, target_language=target_language)
            fallback_res.provider = "nvidia-fallback-mock"
            return fallback_res

