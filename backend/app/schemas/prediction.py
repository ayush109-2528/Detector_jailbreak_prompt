from typing import Literal
from pydantic import BaseModel, Field, field_validator

class PredictionRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=10000)
    strategy: Literal['weighted_average', 'average_probability', 'majority_voting', 'maximum_confidence'] = 'weighted_average'
    threshold: float = Field(default=.5, ge=0, le=1)

    @field_validator('prompt')
    @classmethod
    def nonempty(cls, value):
        if not value.strip():
            raise ValueError('Prompt must contain non-whitespace characters')
        return value
