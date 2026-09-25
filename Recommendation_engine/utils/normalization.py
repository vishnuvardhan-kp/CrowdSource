import re
import string

def normalize_doi(doi: str) -> str:
    if not doi:
        return ""
    doi = doi.lower().strip()
    doi = re.sub(r'^https?://(dx\.)?doi\.org/', '', doi)
    doi = re.sub(r'^doi:', '', doi)
    doi = doi.rstrip(string.punctuation)
    return doi

def normalize_title(title: str) -> str:
    if not title:
        return ""
    title = title.lower().strip()
    # Remove excessive whitespace
    title = re.sub(r'\s+', ' ', title)
    # Remove punctuation
    title = title.translate(str.maketrans('', '', string.punctuation))
    return title.strip()
