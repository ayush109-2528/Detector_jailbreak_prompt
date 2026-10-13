"""Local research orchestration and immutable, provenance-rich experiment records."""
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter
from uuid import uuid4
from threading import RLock as Lock
import hashlib
import io
import os
import math
import joblib
from ml.experts import NAMES, EXPERT_CLASSES
from ml.ensemble.hmeg import HMEG
from ml.ensemble.router import RoutingConfig
from ml.evaluation.data import partitions
from ml.evaluation.metrics import summarize
from ml.evaluation.ablation import variants
from ml.evaluation.routing_analysis import configurations
from ml.evaluation.ood import fit_source_holdout
from ml.training import fit_bundle, fit_ablation_meta

class ResearchService:
    def __init__(self, dataset, directory, store):
        self.dataset, self.directory, self.store = dataset, Path(directory)/'hmeg', store
        self.lock = Lock()
        self.bundle = None
        self.load_error = None
        self.active_name = None
        pointer = self.directory/'active.txt'
        if pointer.exists():
            try:
                name = pointer.read_text().strip()
                if Path(name).name != name:
                    raise ValueError('Invalid artifact filename')
                self.bundle = joblib.load(self.directory/name)
                self.active_name = name
            except Exception:
                self.load_error = 'HMEG artifacts could not be loaded; retrain or restore compatible trusted files.'

    def config(self):
        return RoutingConfig(**(self.store.config() or {}))

    def catalog(self):
        self.refresh_active()
        b = self.bundle
        return dict(trained=b is not None, artifact_error=self.load_error,
                    standalone_experts=[k for k in NAMES if (self.directory/('standalone_'+k+'.pkl')).exists()],
                    training_available=os.getenv('VERCEL') != '1' and os.getenv('AUTO_LEARNING')!='1',
                    preferred_meta=b['preferred_meta'] if b else None,
                    unavailable=b['unavailable'] if b else {},
                    experts=[dict(key=k,name=NAMES[k],layer=1 if k in ('lexical','obfuscation') else 2,
                        features=cls.features, status='trained' if b and k in b['experts'] else 'unavailable' if b else 'not_trained',
                        estimator=b['experts'][k].estimator if b and k in b['experts'] else None)
                        for k,cls in EXPERT_CLASSES.items()])

    def required_bundle(self):
        self.refresh_active()
        if self.bundle is None:
            raise ValueError(self.load_error or 'Train the experts and meta-classifier first, or explicitly select Demo Mode.')
        return self.bundle

    def refresh_active(self):
        pointer=self.directory/'active.txt'
        if not pointer.exists():return
        name=pointer.read_text().strip()
        if name==self.active_name:return
        if Path(name).name!=name:raise ValueError('Invalid artifact filename')
        with self.lock:
            if name!=self.active_name:
                candidate=joblib.load(self.directory/name)
                self.bundle=candidate
                self.active_name=name
                self.load_error=None

    def predict(self, prompt, mode='demo', framework='hmeg', fusion='weighted_average',
                config=None, expert_name=None):
        standalone = self.directory/('standalone_'+str(expert_name)+'.pkl')
        if mode == 'trained' and expert_name in NAMES and standalone.exists():
            expert = joblib.load(standalone)
            result = HMEG({expert_name:expert},config=config or self.config()).predict(
                prompt,flat=True,fusion='average_probability',exclude=[k for k in NAMES if k!=expert_name])
            result.update(framework='expert',strategy=expert_name,decision_layer=0,routed_to_layer_2=False)
            return result
        b = self.required_bundle() if mode == 'trained' else None
        meta = b['metas'].get(fusion if framework=='flat' and fusion.startswith('meta') else b['preferred_meta']) if b else None
        if b and framework=='flat' and fusion.startswith('meta') and meta is None:
            raise ValueError('Requested meta-classifier is unavailable; train with its optional dependency')
        engine = HMEG(b['experts'] if b else None,meta,config or self.config(),demo=b is None)
        if expert_name:
            if expert_name not in NAMES:
                raise ValueError('Unknown expert')
            if b and expert_name not in b['experts']:
                raise ValueError('Selected expert is unavailable')
            result = engine.predict(prompt,flat=True,fusion='average_probability',
                                    exclude=[k for k in NAMES if k!=expert_name])
            result.update(framework='expert', strategy=expert_name, decision_layer=0, routed_to_layer_2=False)
            return result
        result=engine.predict(prompt,flat=framework=='flat',fusion=fusion)
        result['model_version']=b.get('model_version',self.active_name) if b else None
        return result

    def train(self, sources=None, seed=42, target='all', expert_name=None):
        if os.getenv('VERCEL') == '1' or os.getenv('AUTO_LEARNING')=='1':
            raise ValueError('Synchronous training is disabled on this host. Use the review-learning worker or local research runner.')
        if expert_name:
            if expert_name not in EXPERT_CLASSES:
                raise ValueError('Unknown expert')
            parts = partitions(self.dataset,sources,seed=seed)
            e = EXPERT_CLASSES[expert_name]().fit(parts['base'].prompt,parts['base'].label)
            self.directory.mkdir(parents=True,exist_ok=True)
            joblib.dump(e,self.directory/('standalone_'+expert_name+'.pkl'))
            return dict(status='trained',expert=expert_name,scope='Standalone artifact; active HMEG unchanged')
        bundle = fit_bundle(self.dataset,sources,seed=seed)
        self.directory.mkdir(parents=True,exist_ok=True)
        name = str(uuid4())+'.pkl'
        joblib.dump(bundle,self.directory/name)
        temp = self.directory/'active.tmp'
        temp.write_text(name)
        temp.replace(self.directory/'active.txt')
        self.bundle = bundle
        self.active_name = name
        self.load_error = None
        return dict(status='trained',artifact=name,training_time=bundle['training_time'],
                    requested_target=target,scope='All expert dependencies and disjoint meta-training fitted',
                    unavailable=bundle['unavailable'],preferred_meta=bundle['preferred_meta'],
                    partition_counts={k:len(v) for k,v in bundle['parts'].items()})

    def record(self, title, model_type, bundle, predict, part='test', config=None,
               study='comparison', extra=None, components=None):
        frame = bundle['parts'][part]
        predictions = [predict(p) for p in frame.prompt]
        metrics = summarize(frame.label.tolist(),predictions)
        buffer = io.BytesIO()
        components = components if components is not None else (bundle['experts'],bundle['metas'][bundle['preferred_meta']])
        active, meta = components if isinstance(components,tuple) else ({title:components},None)
        joblib.dump(components, buffer)
        times = [getattr(e,'training_time',None) for e in active.values()]
        if meta is not None:
            times.append(getattr(meta,'training_time',None))
        record = dict(schema_version=2,experiment_id=str(uuid4()),run_id=getattr(self,'run_id',str(uuid4())),model_name=title,model_type=model_type,study=study,
            dataset_sources=bundle['sources'],test_sources=sorted(frame.source.unique()),
            dataset_file=bundle['dataset_file'],features={k:e.features for k,e in active.items()},
            hyperparameters={},
            estimators={k:e.estimator for k,e in active.items()},
            routing_thresholds=(config or self.config()).as_dict(),metrics=metrics,
            confusion_matrix=metrics['confusion_matrix'],roc_data=metrics['roc_data'],
            training_time=sum(times) if all(t is not None for t in times) else None,
            suite_training_time=bundle['training_time'],
            training_time_note='Sum of fitted component times; excludes split preparation and meta-feature generation.',
            average_inference_time=metrics['average_inference_time'],
            p95_inference_time=metrics['p95_inference_time'],layer1_exit_rate=metrics['layer1_exit_rate'],
            layer2_routing_rate=metrics['layer2_routing_rate'],
            average_experts_executed=metrics['average_experts_executed'],model_size_bytes=buffer.tell(),
            timestamp=datetime.now(timezone.utc).isoformat(),demo_mode=False,partition=part,
            samples=len(frame),seed=bundle['seed'],unavailable=bundle['unavailable'],
            reduced_expert_set=model_type not in ('single','expert') and len(active)<5,
            split_fingerprints={k:hashlib.sha256('|'.join(sorted(v._key)).encode()).hexdigest()
                                for k,v in bundle['parts'].items()},
            evaluation_note='Measured locally; timing includes feature extraction, excludes HTTP/DB/UI. No scientific optimality claim.',
            **(extra or {}))
        # Keep actual estimator settings serializable and inspectable.
        record['hyperparameters'] = {k:{p:v for p,v in e.model.get_params(deep=True).items()
                                      if (v is None or isinstance(v,(str,int,float,bool))) and
                                      not (isinstance(v,float) and not math.isfinite(v))}
                                    for k,e in active.items()}
        record['meta_classifier'] = meta.kind if meta else None
        record['meta_hyperparameters'] = {k:(str(v) if isinstance(v,float) and not math.isfinite(v) else v)
            for k,v in meta.model.get_params().items()} if meta else {}
        import platform
        record['runtime'] = dict(python=platform.python_version(), platform=platform.platform(),
                                processor=platform.processor(), timing='Sequential single-prompt inference; no warmup excluded')
        return self.store.put(record)

    def single_predictor(self, expert):
        def predict(prompt):
            start = perf_counter()
            score = expert.score(prompt)
            return dict(label=int(score>=.5),final_probability=score,
                        total_inference_time_ms=(perf_counter()-start)*1000,
                        decision_layer=0,routed_to_layer_2=False,experts_executed=1)
        return predict

    def compare(self,bundle=None,part='test',study='comparison',config=None):
        b = bundle or self.required_bundle()
        config = config or self.config()
        rows = []
        for name,e in b['baselines'].items():
            rows.append(self.record(name,'single',b,self.single_predictor(e),part,config,study,components=e))
        for name,e in b['experts'].items():
            rows.append(self.record(NAMES[name],'expert',b,self.single_predictor(e),part,config,study,components=e))
        for name,fusion in [('Flat Majority Ensemble','majority_voting'),
                            ('Flat Average Ensemble','average_probability'),
                            ('Flat Weighted Ensemble','weighted_average'),
                            ('Flat Meta Logistic Regression','meta_logistic'),
                            ('Flat Meta XGBoost','meta_xgboost')]:
            if fusion.startswith('meta') and fusion not in b['metas']:
                continue
            engine = HMEG(b['experts'],b['metas'].get(fusion),config)
            rows.append(self.record(name,'flat',b,lambda p,e=engine,f=fusion:e.predict(p,flat=True,fusion=f),
                                    part,config,study,components=(b['experts'],engine.meta)))
        engine = HMEG(b['experts'],b['metas'][b['preferred_meta']],config)
        rows.append(self.record('HMEG' if len(b['experts'])==5 else 'HMEG (reduced expert set)',
                                'hmeg',b,engine.predict,part,config,study))
        return rows

    def ablation(self, part='test', config=None):
        b, config = self.required_bundle(),config or self.config()
        return [self.record(name,'ablation',b,lambda p,e=e,kw=kw:e.predict(p,**kw),part,config,'ablation',
                            extra={'excluded_experts':excluded},
                            components=({k:v for k,v in b['experts'].items() if k not in excluded},e.meta))
                for name,e,kw,excluded in variants(b,config)]

    def routing(self,pairs,config=None):
        b = self.required_bundle()
        # Threshold exploration is validation-only; never optimize on final test.
        return [self.record(f'HMEG low={c.low_threshold} high={c.high_threshold}','hmeg',b,e.predict,
                            'validation',c,'routing') for c,e in configurations(b,pairs,config or self.config())]

    def ood(self,sources,held_out,seed,config=None):
        if not sources or not held_out:
            raise ValueError('Select explicit training sources and a distinct held-out source')
        b = fit_source_holdout(self.dataset,sources,held_out,seed)
        # Select the best standalone detector on in-source validation, not held-out test.
        from ml.evaluation.metrics import summarize
        best = max(b['baselines'],key=lambda k:summarize(b['parts']['validation'].label.tolist(),
                   [self.single_predictor(b['baselines'][k])(p) for p in b['parts']['validation'].prompt])['f1'])
        rows = self.compare(b,study='ood',config=config)
        for row in rows:
            # Best baseline designation is immutable in its own additional record.
            if row['model_type']=='single' and row['model_name']==best:
                self.store.put({**row,'experiment_id':str(uuid4()),'model_name':'Best single guardrail: '+best,
                                'selection_partition':'in-source validation'})
        return rows

