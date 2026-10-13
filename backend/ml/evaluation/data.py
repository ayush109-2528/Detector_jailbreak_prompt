"""Partition real imported records; normalize keys only for leakage checks."""
import hashlib
from sklearn.model_selection import train_test_split, GroupShuffleSplit
from app.models.preprocessing import preprocess

def key(text):
    return hashlib.sha256(preprocess(str(text)).encode()).hexdigest()

def partitions(dataset, sources=None, held_out=None, seed=42):
    if dataset.demo_mode:
        raise ValueError('Research training requires an imported CSV, not the synthetic demo dataset')
    frame = dataset.frame.copy()
    frame['_key'] = frame.prompt.map(key)
    if 'parent_id' in frame:
        frame['_group'] = frame.parent_id.where(frame.parent_id.ne(''), frame['_key'])
        if 'split' in frame and (frame.groupby('_group')['split'].nunique() > 1).any():
            raise ValueError('Augmentation parent crosses recorded splits; repair CSV before training')
    if frame.groupby('_key').label.nunique().max() > 1:
        raise ValueError('Conflicting labels for duplicate normalized prompts')
    if sources:
        unknown = set(sources)-set(frame.source)
        if unknown:
            raise ValueError('Unknown training source')
    if held_out:
        if not sources or held_out in sources:
            raise ValueError('Choose training sources distinct from the held-out source')
        test = frame[frame.source == held_out].drop_duplicates('_key')
        train_pool = frame[frame.source.isin(sources)]
        # Remove exact overlap from training, never from the OOD test.
        train_pool = train_pool[~train_pool._key.isin(test._key)].drop_duplicates('_key')
        train, validation = split(train_pool, .2, seed)
    else:
        frame = frame[frame.source.isin(sources)] if sources else frame
        if 'split' in frame:
            if frame.groupby('_key')['split'].nunique().max() > 1:
                raise ValueError('Duplicate normalized prompt crosses recorded splits; repair CSV before training')
            frame = frame.drop_duplicates('_key')
            train, validation, test = [frame[frame.split == name] for name in ('train','validation','test')]
        else:
            train, remainder = split(frame.drop_duplicates('_key'), .3, seed)
            validation, test = split(remainder, .5, seed)
    base, meta = split(train, .25, seed)
    for name, part in [('base',base),('meta',meta),('validation',validation),('test',test)]:
        if len(part) == 0 or (name != 'test' and (len(part) < 2 or part.label.nunique() != 2)):
            raise ValueError(f'{name} partition must contain both classes; review source selection and recorded splits')
    return dict(base=base, meta=meta, validation=validation, test=test)

def split(frame, fraction, seed):
    if len(frame) < 4 or frame.label.nunique() != 2:
        raise ValueError('Insufficient two-class data for a stratified partition')
    if '_group' in frame:
        # Keep all descendants of an original record together, including base/meta fitting.
        for attempt in range(30):
            a, b = next(GroupShuffleSplit(n_splits=1, test_size=fraction,
                        random_state=seed+attempt).split(frame, groups=frame['_group']))
            if frame.iloc[a].label.nunique()==2 and frame.iloc[b].label.nunique()==2:
                return frame.iloc[a], frame.iloc[b]
        raise ValueError('Insufficient independent parent groups for two-class partitions')
    return train_test_split(frame, test_size=fraction, stratify=frame.label, random_state=seed)

