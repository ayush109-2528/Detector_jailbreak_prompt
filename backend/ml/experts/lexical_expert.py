from .base import Expert, word_pipeline

class LexicalExpert(Expert):
    features = 'Word TF-IDF unigrams + bigrams; lexical jailbreak wording'
    def __init__(self):
        self.model = word_pipeline()

