import hashlib
import json
import pytest
from verify_deployment import REQUIRED, verify


def make_package(directory):
    files = {}
    for name in REQUIRED:
        path = directory / name
        path.parent.mkdir(parents=True, exist_ok=True)
        content = b'runtime.pkl' if name.endswith('active.txt') else b'test fixture'
        path.write_bytes(content)
        files[name] = {'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()}
    (directory / 'manifest.json').write_text(json.dumps({'files': files}))


def test_preflight_accepts_complete_package(tmp_path):
    make_package(tmp_path)
    assert verify(tmp_path) == len(REQUIRED)


def test_preflight_fails_missing_package(tmp_path):
    with pytest.raises(ValueError, match='Missing backend/deployment'):
        verify(tmp_path)


def test_preflight_fails_missing_artifact(tmp_path):
    make_package(tmp_path)
    (tmp_path / 'models/hmeg/runtime.pkl').unlink()
    with pytest.raises(ValueError, match='Missing or invalid'):
        verify(tmp_path)


def test_preflight_fails_corrupted_artifact(tmp_path):
    make_package(tmp_path)
    (tmp_path / 'models/hmeg/runtime.pkl').write_bytes(b'changed')
    with pytest.raises(ValueError, match='integrity'):
        verify(tmp_path)
