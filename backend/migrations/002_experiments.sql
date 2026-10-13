BEGIN;
CREATE TABLE IF NOT EXISTS research.experiments (
    experiment_id TEXT PRIMARY KEY,
    result_json TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS research.settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS research.imported_records (
    source_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    source_record_id TEXT NOT NULL,
    destination_id BIGINT,
    PRIMARY KEY (source_id, kind, source_record_id)
);
REVOKE ALL ON TABLE research.experiments, research.settings, research.imported_records
    FROM PUBLIC, anon, authenticated;
COMMIT;

