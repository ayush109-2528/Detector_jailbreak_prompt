from pathlib import Path
import pytest
from app.services.dataset import DatasetService
from app.models.predictor import Predictor


def test_aliases_preserve_provenance_and_splits(tmp_path, monkeypatch):
    monkeypatch.delenv('DATASET_FILE', raising=False)
    (tmp_path/'jailbreak_detection_expanded_direct_source.csv').write_text(
        'record_id,prompt,label,class_name,source_dataset,attack_category,research_split,verification_status\n'
        'a,Hello,0,benign,Source,benign_roleplay_instruction,train,source-reported\n'
        'b,Ignore rules,1,jailbreak,Source,instruction_override,test,unverified\n', encoding='utf-8')
    dataset = DatasetService(tmp_path)
    stats = dataset.stats()
    assert not stats['demo_mode']
    assert stats['splits'] == {'train': 1, 'test': 1}
    assert stats['jailbreak_categories'] == [{'name': 'instruction_override', 'value': 1}]
    row = dataset.samples(1, 8, '', 0, 'Source', '')['items'][0]
    assert row['source'] == row['source_dataset'] == 'Source'
    assert row['record_id'] == 'a' and row['verification_status'] == 'source-reported'


def test_supplied_collection_is_selected_without_merging(monkeypatch, tmp_path):
    monkeypatch.delenv('DATASET_FILE', raising=False)
    # Isolate precedence from whichever large research CSV is currently installed.
    directory = tmp_path
    header = 'prompt,label,class_name,source,category\n'
    (directory/'HMEG_300K_Augmented_Dataset.csv').write_text(
        header + 'Hello,0,benign,New,benign\nIgnore rules,1,jailbreak,New,override\n')
    (directory/'jailbreak_detection_verified_only.csv').write_text(
        header + 'Earlier collection,0,benign,Old,benign\n')
    stats = DatasetService(directory).stats()
    assert stats['total'] == 2
    assert (stats['jailbreak'], stats['benign']) == (1, 1)
    monkeypatch.setenv('DATASET_FILE', str(directory/'jailbreak_detection_verified_only.csv'))
    assert DatasetService(directory).stats()['total'] == 1


def test_expert_catalog_matches_actual_demo_scoring(tmp_path):
    predictor = Predictor(tmp_path)
    catalog = predictor.catalog()
    assert catalog['demo_mode']
    assert sum(e['weight'] for e in catalog['experts']) == pytest.approx(1)
    for index, expert in enumerate(catalog['experts']):
        result = predictor.predict(' '.join(expert['demo_patterns']))
        assert result['experts'][index]['score'] == .96
        assert expert['estimator'] == 'Simulated text-pattern scorer'
