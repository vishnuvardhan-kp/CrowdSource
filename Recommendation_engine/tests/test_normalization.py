import pytest
from utils.normalization import normalize_doi, normalize_title
from ingestion.validate import validate_url_syntax

def test_normalize_doi():
    assert normalize_doi("doi:10.xxxx/ABC") == "10.xxxx/abc"
    assert normalize_doi("https://doi.org/10.xxxx/ABC") == "10.xxxx/abc"
    assert normalize_doi(" 10.xxxx/abc.") == "10.xxxx/abc"
    
def test_normalize_title():
    assert normalize_title("  The   Title! ") == "the title"
    assert normalize_title("Data-sets: A Review.") == "datasets a review"
    
def test_validate_url_syntax():
    assert validate_url_syntax("https://google.com") == True
    assert validate_url_syntax("http://data.gov.in/path") == True
    assert validate_url_syntax("not-a-url") == False
    assert validate_url_syntax("") == False
