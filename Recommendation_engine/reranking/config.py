from dataclasses import dataclass

@dataclass
class PaperWeights:
    semantic: float = 0.50
    keyword: float = 0.20
    domain: float = 0.15
    recency: float = 0.10
    citation: float = 0.05
    
    def __post_init__(self):
        total = sum([self.semantic, self.keyword, self.domain, self.recency, self.citation])
        if abs(total - 1.0) > 1e-6:
            raise ValueError(f"Paper weights must sum to 1.0, got {total}")

@dataclass
class DatasetWeights:
    semantic: float = 0.55
    keyword: float = 0.20
    domain: float = 0.15
    geographic: float = 0.10
    
    def __post_init__(self):
        total = sum([self.semantic, self.keyword, self.domain, self.geographic])
        if abs(total - 1.0) > 1e-6:
            raise ValueError(f"Dataset weights must sum to 1.0, got {total}")

DEFAULT_PAPER_WEIGHTS = PaperWeights()
DEFAULT_DATASET_WEIGHTS = DatasetWeights()
