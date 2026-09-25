from embeddings.text_builder import build_paper_embedding_text, build_dataset_embedding_text

class MockPaper:
    def __init__(self, title, abstract, keywords, topics, domain):
        self.title = title
        self.abstract = abstract
        self.keywords = keywords
        self.topics = topics
        self.domain = domain

class MockDataset:
    def __init__(self, name, description, keywords, features, geo, domain):
        self.name = name
        self.description = description
        self.keywords = keywords
        self.features = features
        self.geographic_scope = geo
        self.domain = domain

def test_build_paper_text():
    p = MockPaper(
        title="Smart Irrigation",
        abstract="Uses IoT",
        keywords=["IoT", "Water"],
        topics=["Agriculture Technology"],
        domain="Agriculture"
    )
    result = build_paper_embedding_text(p)
    assert result == "Title: Smart Irrigation. Abstract: Uses IoT. Keywords: IoT, Water. Topics: Agriculture Technology. Domain: Agriculture."
    
def test_build_paper_text_missing():
    p = MockPaper(
        title="Just Title",
        abstract=None,
        keywords=[],
        topics=None,
        domain="Agriculture"
    )
    result = build_paper_embedding_text(p)
    assert result == "Title: Just Title. Domain: Agriculture."

def test_build_dataset_text():
    d = MockDataset(
        name="Soil Data",
        description="Soil pH levels",
        keywords=["Soil"],
        features=["pH"],
        geo="India",
        domain="Agriculture"
    )
    result = build_dataset_embedding_text(d)
    assert result == "Name: Soil Data. Description: Soil pH levels. Keywords: Soil. Features: pH. Geographic Scope: India. Domain: Agriculture."
