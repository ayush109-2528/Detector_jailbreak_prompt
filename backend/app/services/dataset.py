from pathlib import Path
import os
import pandas as pd

class DatasetService:
    def __init__(self, directory: Path):
        explicit = os.getenv('DATASET_FILE')
        candidates = [directory / name for name in (
            'HMEG_300K_Augmented_Dataset.csv.gz',
            'HMEG_300K_Augmented_Dataset.csv',
            'jailbreak_detection_expanded_direct_source.csv',
            'jailbreak_detection_verified_only.csv',
            'combined_jailbreak_dataset_balanced.csv',
            'jailbreak_dataset.csv',
            'combined_jailbreak_dataset_full.csv',
        )]
        actual = Path(explicit) if explicit else next((p for p in candidates if p.is_file()), None)
        self.demo_mode = actual is None
        selected = actual if actual is not None else directory / 'demo_dataset.csv'
        self.filename = selected.name
        # An explicit missing file is an error, never a silent demo fallback.
        self.frame = pd.read_csv(selected, keep_default_na=False)
        # Keep supplied provenance columns intact; add dashboard aliases.
        for original, canonical in [('source_dataset', 'source'), ('attack_category', 'category'), ('research_split', 'split')]:
            if original in self.frame and canonical not in self.frame:
                self.frame[canonical] = self.frame[original]
        required = {'prompt', 'label', 'class_name', 'source', 'category'}
        if not required.issubset(self.frame.columns):
            raise ValueError(f'Dataset requires columns: {sorted(required)}')
        self.frame['label'] = pd.to_numeric(self.frame['label'], errors='raise')
        if not self.frame['label'].isin([0, 1]).all():
            raise ValueError('Labels must be 0 or 1')
        if not self.frame['prompt'].astype(str).str.strip().ne('').all():
            raise ValueError('Empty prompts are not allowed')
        if not (self.frame['class_name'] == self.frame['label'].map({0: 'benign', 1: 'jailbreak'})).all():
            raise ValueError('class_name must agree with label')
        self.frame['id'] = range(1, len(self.frame) + 1)
        if 'split' in self.frame and not self.frame['split'].isin(['train', 'validation', 'test']).all():
            raise ValueError('split must be train, validation, or test')

    def stats(self):
        f, n = self.frame, len(self.frame)
        counts = lambda column: [{'name': str(k), 'value': int(v)} for k, v in f[column].value_counts().items()]
        actual_splits = 'split' in f
        splits = f['split'].value_counts().to_dict() if actual_splits else {'train': int(n*.7), 'validation': int(n*.15), 'test': n-int(n*.7)-int(n*.15)}
        return {'total': n, 'benign': int((f.label == 0).sum()), 'jailbreak': int((f.label == 1).sum()),
                'synthetic_samples':int(pd.to_numeric(f['is_synthetic']).sum()) if 'is_synthetic' in f else None,
                'original_samples':int((pd.to_numeric(f['is_synthetic'])==0).sum()) if 'is_synthetic' in f else None,
                'demo_mode': self.demo_mode, 'dataset_file': self.filename, 'splits': splits, 'split_status': 'recorded' if actual_splits else 'planned',
                'sources': counts('source'), 'categories': counts('category'), 'class_distribution': counts('class_name'),
                'jailbreak_categories': [{'name': str(k), 'value': int(v)} for k, v in f.loc[f.label == 1, 'category'].value_counts().items()],
                'verification': counts('verification_status') if 'verification_status' in f else []}

    def samples(self, page, page_size, search, label, source, category):
        f = self.frame
        if search:
            f = f[f.prompt.str.contains(search, case=False, regex=False)]
        for column, value in [('label', label), ('source', source), ('category', category)]:
            if value is not None and value != '':
                f = f[f[column] == value]
        return {'items': f.iloc[(page-1)*page_size:page*page_size].to_dict('records'), 'total': len(f), 'page': page, 'page_size': page_size, 'demo_mode': self.demo_mode}
