from typing import Literal
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, Field, model_validator
from ml.ensemble.router import RoutingConfig

router = APIRouter(prefix='/api',tags=['HMEG research'])
class ConfigBody(BaseModel):
    low_threshold: float = Field(.2,ge=0,le=1)
    high_threshold: float = Field(.8,ge=0,le=1)
    lexical_weight: float = Field(.5,ge=0,le=1)
    threshold: float = Field(.5,ge=0,le=1)
    @model_validator(mode='after')
    def valid(self):
        RoutingConfig(**self.model_dump())
        return self

class PredictBody(BaseModel):
    prompt: str = Field(min_length=1,max_length=10000)
    mode: Literal['demo','trained'] = 'demo'
    fusion: Literal['majority_voting','average_probability','weighted_average','maximum_confidence','meta_logistic','meta_xgboost'] = 'weighted_average'
    routing: ConfigBody | None = None
    @model_validator(mode='after')
    def nonblank(self):
        if not self.prompt.strip():
            raise ValueError('Prompt must not be blank')
        return self

class TrainBody(BaseModel):
    training_sources: list[str] | None = None
    seed: int = Field(42,ge=0,le=2147483647)

class EvaluateBody(TrainBody):
    routing: ConfigBody | None = None
    held_out_source: str | None = None
    partition: Literal['test','validation'] = 'test'
    threshold_pairs: list[tuple[float,float]] = Field(default_factory=lambda:[(.1,.9),(.2,.8),(.3,.7)],max_length=12,min_length=1)

def service(request):
    return request.app.state.research

def call(fn):
    try:
        return fn()
    except HTTPException:
        raise
    except (ValueError,RuntimeError,ImportError) as exc:
        raise HTTPException(422, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(503,'Research operation failed. Check database migrations, dependencies and trusted model artifacts.') from exc

def exclusive(s,fn):
    import os
    if os.getenv('AUTO_LEARNING')=='1' or os.getenv('VERCEL')=='1':
        raise HTTPException(409,'Hosted research jobs run in the PC learning worker. Run large comparison/evaluation jobs locally.')
    if not s.lock.acquire(blocking=False):
        raise HTTPException(409,'Another research operation is running')
    try:
        from uuid import uuid4
        s.run_id = str(uuid4())
        return call(fn)
    finally:
        s.lock.release()

@router.get('/research/catalog')
def catalog(request: Request):
    return service(request).catalog()

@router.get('/research/experiments')
def experiments(request: Request):
    return call(lambda: {'items':service(request).store.list()})

@router.get('/routing/config')
def get_config(request: Request):
    return call(lambda: service(request).config().as_dict())

@router.put('/routing/config')
def put_config(body: ConfigBody,request: Request):
    return call(lambda: service(request).store.config(body.model_dump()))

@router.post('/train/expert/{expert_name}')
def train_expert(expert_name: str, body: TrainBody, request: Request):
    s = service(request)
    return exclusive(s,lambda:s.train(body.training_sources,body.seed,expert_name=expert_name))

@router.post('/train/{target}')
def train(target: str, body: TrainBody,request: Request):
    if target not in ('all-experts','flat-ensemble','hmeg'):
        raise HTTPException(404,'Unknown training target')
    s = service(request)
    return exclusive(s,lambda:s.train(body.training_sources,body.seed,target=target))

@router.post('/predict/expert/{expert_name}')
def predict_expert(expert_name: str,body: PredictBody,request: Request):
    return prediction(body,request,expert_name=expert_name)

@router.post('/predict/flat-ensemble')
def flat(body: PredictBody,request: Request):
    return prediction(body,request,framework='flat')

@router.post('/predict/hmeg')
def hierarchical(body: PredictBody,request: Request):
    return prediction(body,request)

def prediction(body,request,framework='hmeg',expert_name=None):
    s = service(request)
    def run():
        result = s.predict(body.prompt,body.mode,framework,body.fusion,
                           RoutingConfig(**body.routing.model_dump()) if body.routing else None,expert_name)
        result['analysis_id'] = request.app.state.feedback.record(result)
        return result
    return call(run)

@router.post('/evaluate/{kind}')
def evaluate(kind: str,body: EvaluateBody,request: Request):
    s = service(request)
    import os
    if os.getenv('VERCEL') == '1':
        raise HTTPException(409,'Run research evaluation locally; hosted functions serve saved experiments and predictions.')
    def run():
        config = RoutingConfig(**body.routing.model_dump()) if body.routing else None
        if kind == 'ablation':
            items = s.ablation(body.partition,config)
        elif kind == 'routing':
            items = s.routing(body.threshold_pairs,config)
        elif kind == 'ood':
            if not body.held_out_source:
                raise ValueError('Select a held-out source')
            items = s.ood(body.training_sources,body.held_out_source,body.seed,config)
        elif kind == 'comparison':
            items = s.compare(part=body.partition,config=config)
        else:
            raise HTTPException(404,'Unknown evaluation')
        return {'items':items}
    return exclusive(s,run)

