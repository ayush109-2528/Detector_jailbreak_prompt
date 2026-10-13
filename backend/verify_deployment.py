"""Fail deployment builds early if the prepared inference release is absent.

Uses only the standard library. Never trains, unpickles models or reads secrets.
"""
import hashlib
import json
from pathlib import Path

REQUIRED = {
    'models/hmeg/active.txt',
    'models/hmeg/runtime.pkl',
    'data/HMEG_300K_Augmented_Dataset.csv.gz',
    'data/augmented_training_report.json',
    'data/dataset.sha256',
}


def verify(directory):
    directory = Path(directory).resolve()
    manifest_path = directory / 'manifest.json'
    if not manifest_path.is_file():
        raise ValueError('Missing backend/deployment/manifest.json. Run backend/scripts/package_vercel.py locally and include backend/deployment in the deployment upload or Git commit.')
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    files = {name.replace('\\', '/'): item for name, item in manifest['files'].items()}
    if not REQUIRED.issubset(files):
        raise ValueError('Incomplete deployment manifest; regenerate the inference package locally.')
    for name, metadata in files.items():
        path = (directory / name).resolve()
        if not path.is_relative_to(directory) or not path.is_file():
            raise ValueError(f'Missing or invalid deployment asset: {name}')
        digest = hashlib.sha256()
        with path.open('rb') as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b''):
                digest.update(chunk)
        if path.stat().st_size != metadata['bytes'] or digest.hexdigest() != metadata['sha256']:
            raise ValueError(f'Deployment asset failed integrity check: {name}')
    if (directory / 'models/hmeg/active.txt').read_text().strip() != 'runtime.pkl':
        raise ValueError('Deployment pointer must reference runtime.pkl.')
    return len(files)


if __name__ == '__main__':
    try:
        count = verify(Path(__file__).resolve().parent / 'deployment')
    except (ValueError, OSError, KeyError) as exc:
        raise SystemExit(f'Deployment preflight failed: {exc}')
    print(f'Deployment preflight passed: {count} inference assets verified.')
