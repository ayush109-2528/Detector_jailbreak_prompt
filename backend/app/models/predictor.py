from pathlib import Path
from time import perf_counter
import joblib
from .preprocessing import preprocess
from .expert_model import ExpertModel
from .ensemble import combine

EXPERTS = [('Instruction Override Expert', 'instruction_override', 'instruction'),
           ('Roleplay Expert', 'roleplay', 'roleplay'),
           ('Adversarial Suffix Expert', 'adversarial_suffix', 'suffix'),
           ('General Jailbreak Expert', 'general', 'general')]
WEIGHTS = [.3, .2, .2, .3]
DEMO_PATTERNS = [('ignore', 'override', 'previous instructions', 'disregard'),
                 ('pretend', 'roleplay', 'act as', 'unrestricted'),
                 ('!!!', 'suffix', '###', 'decode'),
                 ('bypass', 'jailbreak', 'no restrictions', 'ignore')]
PURPOSES = [
    'Detect attempts to replace or disregard existing instructions.',
    'Detect persona or role-playing requests used to evade restrictions. Ordinary role-play can be benign.',
    'Detect adversarial additions, obfuscated fragments, or suffix patterns. Punctuation alone is not proof of an attack.',
    'Detect broader jailbreak language and patterns that overlap the specialist categories.',
]

class Predictor:
    def __init__(self, directory: Path):
        self.demo_mode = True
        self.reason = 'Trained artifacts are absent. Scores are simulated.'
        self.experts = []
        files = [directory / 'tfidf_vectorizer.pkl'] + [directory / f'expert_{e[2]}.pkl' for e in EXPERTS]
        if all(p.exists() for p in files):
            try:
                # Only load trusted local artifacts: joblib files can execute code.
                self.vectorizer = joblib.load(files[0])
                self.experts = [ExpertModel(e[0], e[1], joblib.load(p)) for e, p in zip(EXPERTS, files[1:])]
                features = self.vectorizer.transform([preprocess('validation probe')])
                for expert in self.experts:
                    expert.score(features)
                self.demo_mode, self.reason = False, 'Loaded all four experts and the shared vectorizer.'
            except Exception:
                self.reason = 'Artifacts failed validation. Demo Mode is active; check model compatibility.'

    def catalog(self):
        return {'demo_mode': self.demo_mode, 'mode_note': self.reason,
                'experts': [{'name': e[0], 'category': e[1], 'weight': WEIGHTS[i],
                             'purpose': PURPOSES[i], 'demo_patterns': list(DEMO_PATTERNS[i]),
                             'artifact': f'expert_{e[2]}.pkl',
                             'estimator': 'Simulated text-pattern scorer' if self.demo_mode else type(self.experts[i].estimator).__name__}
                            for i, e in enumerate(EXPERTS)]}

    def predict(self, prompt, strategy='weighted_average', threshold=.5):
        start = perf_counter()
        normalized = preprocess(prompt)
        if self.demo_mode:
            scores = [min(.96, .12 + .34 * sum(word in normalized for word in terms)) for terms in DEMO_PATTERNS]
        else:
            features = self.vectorizer.transform([normalized])
            scores = [expert.score(features) for expert in self.experts]
        score = combine(scores, strategy, WEIGHTS)
        label = int(score >= threshold)
        return {'prompt': prompt, 'normalized_prompt': normalized, 'prediction': 'jailbreak' if label else 'benign',
                'label': label, 'action': 'block' if label else 'allow', 'ensemble_score': score,
                'threshold': threshold, 'strategy': strategy, 'weights': WEIGHTS,
                'demo_mode': self.demo_mode, 'mode_note': self.reason,
                'experts': [{'name': e[0], 'category': e[1], 'score': s, 'prediction': 'jailbreak' if s >= .5 else 'benign'} for e, s in zip(EXPERTS, scores)],
                'processing_steps': ['preprocessing', 'feature_extraction', 'expert_prediction', 'ensemble', 'final_decision'],
                'inference_time_ms': round((perf_counter() - start) * 1000, 3)}
