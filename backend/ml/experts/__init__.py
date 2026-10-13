from .lexical_expert import LexicalExpert
from .obfuscation_expert import ObfuscationExpert
from .semantic_expert import SemanticExpert
from .anomaly_expert import AnomalyExpert
from .instruction_expert import InstructionExpert

EXPERT_CLASSES = dict(lexical=LexicalExpert, obfuscation=ObfuscationExpert,
                     semantic=SemanticExpert, anomaly=AnomalyExpert, instruction=InstructionExpert)
NAMES = dict(lexical='Lexical Expert', obfuscation='Obfuscation Expert',
             semantic='Semantic Intent Expert', anomaly='Adversarial / Anomaly Expert',
             instruction='Instruction Manipulation Expert')

