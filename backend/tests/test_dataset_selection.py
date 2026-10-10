import pytest
from app.services.dataset import DatasetService

CSV = 'prompt,label,class_name,source,category\nHello,0,benign,Test fixture,benign\n'

def test_balanced_preferred_and_summary_not_ingested(tmp_path, monkeypatch):
    monkeypatch.delenv('DATASET_FILE', raising=False)
    for name in ['demo_dataset.csv','combined_jailbreak_dataset_full.csv','combined_jailbreak_dataset_balanced.csv']:
        (tmp_path/name).write_text(CSV,encoding='utf-8')
    (tmp_path/'combined_jailbreak_dataset_summary.csv').write_text('source,count\nTest,1\n',encoding='utf-8')
    stats=DatasetService(tmp_path).stats()
    assert stats['dataset_file']=='combined_jailbreak_dataset_balanced.csv'
    assert stats['demo_mode'] is False

def test_explicit_path_and_missing_file(tmp_path,monkeypatch):
    path=tmp_path/'custom.csv';path.write_text(CSV,encoding='utf-8')
    monkeypatch.setenv('DATASET_FILE',str(path))
    assert DatasetService(tmp_path).stats()['dataset_file']=='custom.csv'
    monkeypatch.setenv('DATASET_FILE',str(tmp_path/'missing.csv'))
    with pytest.raises(FileNotFoundError):DatasetService(tmp_path)
