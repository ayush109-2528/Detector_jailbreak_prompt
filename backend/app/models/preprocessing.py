"""Keep normalization identical during training and inference."""
import re
import unicodedata

def preprocess(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", text)).strip().lower()
