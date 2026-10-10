from typing import Literal
from pydantic import BaseModel, model_validator


class FeedbackRequest(BaseModel):
    label: Literal[0, 1]
    category: Literal['benign', 'instruction_override', 'roleplay', 'adversarial_suffix', 'general']

    @model_validator(mode='after')
    def consistent_category(self):
        if (self.label == 0) != (self.category == 'benign'):
            raise ValueError('Benign labels require the benign category; jailbreak labels require an attack category.')
        return self
