import re
from typing import List, Dict, Any, Optional
from .schemas import (
    CapabilityTaxonomyItem,
    NormalizedCapability,
    NormalizeCapabilitiesResponse,
)
from .config import settings

# Built-in Official Capability Taxonomy Mapping & Aliases
# Built-in Official Capability Taxonomy Mapping & Aliases
OFFICIAL_TAXONOMY: List[Dict[str, Any]] = [
    {
        "id": "cap-iot-001",
        "name": "Internet of Things (IoT)",
        "slug": "iot-sensor-networks",
        "category": "Technology",
        "aliases": [
            "iot", "smart sensors", "sensor networks", "iot sensor networks",
            "remote telemetry", "smart agricultural sensors", "telemetry",
            "communication networks", "monitoring networks", "alert systems", "sensor systems"
        ],
    },
    {
        "id": "cap-ai-002",
        "name": "Computer Vision & Image Processing",
        "slug": "computer-vision",
        "category": "AI / ML",
        "aliases": [
            "computer vision", "image recognition", "drone imagery", "satellite image analysis",
            "object detection", "image analysis", "image diagnostics", "visual inspection",
            "image processing", "ai-powered image analysis"
        ],
    },
    {
        "id": "cap-gis-003",
        "name": "Geographic Information Systems (GIS)",
        "slug": "gis-spatial-mapping",
        "category": "Geospatial",
        "aliases": ["gis", "spatial mapping", "route optimization", "geospatial analytics", "gps tracking", "mapping"],
    },
    {
        "id": "cap-wat-004",
        "name": "Water Purification & Filtration",
        "slug": "water-purification",
        "category": "Environmental Engineering",
        "aliases": ["water purification", "reverse osmosis", "water testing", "drinking water treatment", "water filtration"],
    },
    {
        "id": "cap-env-005",
        "name": "Environmental & Hydraulic Modeling",
        "slug": "hydraulic-modeling",
        "category": "Civil Engineering",
        "aliases": ["hydraulic modeling", "drainage design", "flood modeling", "environmental engineering", "water flow simulation"],
    },
    {
        "id": "cap-med-006",
        "name": "Telemedicine & Mobile Health",
        "slug": "telemedicine-systems",
        "category": "Healthcare",
        "aliases": ["telemedicine", "telehealth", "mobile health", "telemedicine systems", "remote health monitoring"],
    },
    {
        "id": "cap-mob-007",
        "name": "Emergency Healthcare Coordination",
        "slug": "emergency-healthcare",
        "category": "Healthcare",
        "aliases": ["emergency healthcare", "emergency medical transit", "ambulance logistics", "first responder coordination"],
    },
    {
        "id": "cap-agr-008",
        "name": "Soil Science & Agronomy",
        "slug": "soil-science",
        "category": "Agriculture",
        "aliases": [
            "soil science", "soil health", "crop advisory", "precision farming", "agronomy",
            "plant pathology", "crop disease", "crop protection", "plant disease", "disease management",
            "agricultural pest control", "plant pathology and disease management", "disease detection",
            "disease diagnosis"
        ],
    },
    {
        "id": "cap-civ-009",
        "name": "Road & Pavement Engineering",
        "slug": "civil-engineering",
        "category": "Civil Engineering",
        "aliases": ["civil engineering", "pavement engineering", "road durability", "infrastructure repair", "traffic management"],
    },
    {
        "id": "cap-dat-010",
        "name": "Data Analytics & Predictive Modeling",
        "slug": "data-analytics",
        "category": "Data Science",
        "aliases": ["data analytics", "predictive modeling", "statistical analysis", "big data", "machine learning", "data analysis", "data sharing", "digital platforms"],
    },
]

# Non-domain generic stopwords that must not trigger spurious keyword matches (e.g., 'systems' matching 'GIS')
TAXONOMY_STOPWORDS = {
    "systems", "system", "management", "and", "or", "in", "for", "of", "the", "a", "an",
    "with", "to", "at", "by", "from", "on", "solutions", "services", "technologies",
    "technology", "engineering", "data", "analysis", "advanced", "specialized", "effective",
    "realtime", "capabilities", "expertise"
}

def normalize_capability_term(
    term: str,
    dynamic_taxonomy: Optional[List[CapabilityTaxonomyItem]] = None,
) -> NormalizedCapability:
    clean_term = term.strip().lower()
    clean_term = re.sub(r"[^\w\s]", "", clean_term)

    # 1. Exact Match against dynamic taxonomy if provided
    if dynamic_taxonomy:
        for item in dynamic_taxonomy:
            if clean_term == item.name.lower() or clean_term == item.slug.lower():
                return NormalizedCapability(
                    original_term=term,
                    normalized_capability_id=item.id,
                    normalized_name=item.name,
                    confidence=1.0,
                    method="exact_dynamic",
                    requires_review=False,
                )

    # 2. Exact Match against built-in official taxonomy
    for item in OFFICIAL_TAXONOMY:
        if clean_term == item["name"].lower() or clean_term == item["slug"].lower():
            return NormalizedCapability(
                original_term=term,
                normalized_capability_id=item["id"],
                normalized_name=item["name"],
                confidence=1.0,
                method="exact",
                requires_review=False,
            )

    # 3. Alias / Synonym matching (sub-phrase matching)
    for item in OFFICIAL_TAXONOMY:
        for alias in item["aliases"]:
            clean_alias = re.sub(r"[^\w\s]", "", alias.lower())
            if clean_alias in clean_term or clean_term in clean_alias:
                return NormalizedCapability(
                    original_term=term,
                    normalized_capability_id=item["id"],
                    normalized_name=item["name"],
                    confidence=0.92,
                    method="alias",
                    requires_review=False,
                )

    # 4. Keyword / Token overlap matching (filtering generic non-domain stopwords)
    term_tokens = {w for w in clean_term.split() if w not in TAXONOMY_STOPWORDS and len(w) > 2}
    best_match = None
    best_overlap = 0

    if term_tokens:
        for item in OFFICIAL_TAXONOMY:
            name_tokens = {w for w in item["name"].lower().split() if w not in TAXONOMY_STOPWORDS and len(w) > 2}
            overlap = len(term_tokens.intersection(name_tokens))
            if overlap > best_overlap:
                best_overlap = overlap
                best_match = item

    if best_match and best_overlap > 0:
        return NormalizedCapability(
            original_term=term,
            normalized_capability_id=best_match["id"],
            normalized_name=best_match["name"],
            confidence=0.75,
            method="keyword_overlap",
            requires_review=False,
        )

    # 5. Low-confidence fallback -> Requires Human Review
    return NormalizedCapability(
        original_term=term,
        normalized_capability_id=None,
        normalized_name=term,
        confidence=0.30,
        method="unmatched_fallback",
        requires_review=True,
    )

def normalize_capabilities_batch(
    terms: List[str],
    dynamic_taxonomy: Optional[List[CapabilityTaxonomyItem]] = None,
) -> NormalizeCapabilitiesResponse:
    results: List[NormalizedCapability] = []
    for t in terms:
        results.append(normalize_capability_term(t, dynamic_taxonomy))

    return NormalizeCapabilitiesResponse(
        taxonomy_version=settings.TAXONOMY_VERSION,
        results=results,
    )
