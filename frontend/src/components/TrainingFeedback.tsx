import { useState } from "react";
import { api } from "../api/client";
import { useResource } from "../hooks/useResource";
import { Card, Badge, ErrorBox, Loading } from "./UI";
import { Updating } from "./Updating";

export function TrainingFeedback({ revision }: { revision?: number }) {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<number>();
  const [category, setCategory] = useState("benign");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const history = useResource(() => api.feedback(page), `${page}:${revision}`);
  const displayedPage = history.data?.page ?? page;
  async function save() {
    if (editing === undefined) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.review(editing, category === "benign" ? 0 : 1, category);
      setEditing(undefined);
      setMessage(
        "Reviewed label saved. This prompt is now included in the training CSV.",
      );
      history.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save review");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Card
      title="Training data collection"
      subtitle="Every successful analysis is saved in the configured database. Review the intended class before including a prompt in training."
      action={
        <a
          className="button secondary"
          href="/api/training/examples.csv"
          download
        >
          Export reviewed CSV
        </a>
      }
    >
      <p className="help-text">
        Predictions are observations, not correct labels. Saved examples do not
        automatically retrain or change the detector. Duplicate normalized
        prompts share one reviewed label and export once.
      </p>
      {history.data && (
        <div className="source-chips" style={{ margin: "16px 0" }}>
          <Badge tone="neutral">{history.data.total} saved analyses</Badge>
          <Badge tone="amber">
            {history.data.pending_prompts} prompts awaiting review
          </Badge>
          <Badge tone="green">
            {history.data.reviewed_prompts} reviewed prompts
          </Badge>
        </div>
      )}
      <Updating active={history.fetching && !!history.data} />
      {history.error && (
        <ErrorBox message={history.error} retry={history.reload} />
      )}
      {history.loading ? (
        <Loading />
      ) : (
        <div
          className="table-scroll feedback-results"
          aria-busy={history.fetching}
        >
          <table>
            <thead>
              <tr>
                <th>Saved prompt</th>
                <th>Observed result</th>
                <th>Training label</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {history.data?.items.map((row) => (
                <tr key={row.analysis_id}>
                  <td className="prompt-cell">
                    {row.prompt}
                    <div className="help-text">
                      #{row.analysis_id} ·{" "}
                      {new Date(row.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td>
                    <Badge tone={row.label ? "red" : "green"}>
                      {row.prediction}
                    </Badge>
                    <div className="help-text">
                      {row.ensemble_score.toFixed(3)} / threshold{" "}
                      {row.threshold.toFixed(2)} ·{" "}
                      {row.demo_mode ? "Demo" : "Trained"}
                    </div>
                  </td>
                  <td>
                    {row.reviewed_label === null
                      ? "Pending review"
                      : `${row.reviewed_label === 0 ? "Benign" : "Jailbreak"} · ${row.reviewed_category?.replaceAll("_", " ")}`}
                  </td>
                  <td>
                    <button
                      className="button secondary"
                      disabled={saving || history.fetching}
                      onClick={() => {
                        setEditing(row.analysis_id);
                        setCategory(row.reviewed_category || "benign");
                        setMessage("");
                      }}
                    >
                      Review #{row.analysis_id}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!history.data?.items.length && (
            <div className="empty-state">
              Analyze a prompt to begin collecting examples.
            </div>
          )}
        </div>
      )}
      <div className="pagination">
        <span>
          Page {displayedPage} of{" "}
          {Math.max(1, Math.ceil((history.data?.total || 0) / 5))}
        </span>
        <div>
          <button
            disabled={
              displayedPage === 1 ||
              saving ||
              history.fetching ||
              !!history.error
            }
            onClick={() => setPage(displayedPage - 1)}
          >
            Previous
          </button>
          <button
            disabled={
              displayedPage * 5 >= (history.data?.total || 0) ||
              saving ||
              history.fetching ||
              !!history.error
            }
            onClick={() => setPage(displayedPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
      {editing !== undefined && (
        <div className="settings-grid">
          <label>
            Reviewed class / category for analysis #{editing}
            <select
              aria-label="Reviewed class and category"
              value={category}
              disabled={saving}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="benign">Benign</option>
              <option value="instruction_override">
                Jailbreak · Instruction override
              </option>
              <option value="roleplay">Jailbreak · Roleplay</option>
              <option value="adversarial_suffix">
                Jailbreak · Adversarial suffix
              </option>
              <option value="general">Jailbreak · General / combined</option>
            </select>
          </label>
          <div className="button-row">
            <button className="button primary" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save reviewed label"}
            </button>
            <button
              className="button secondary"
              disabled={saving}
              onClick={() => setEditing(undefined)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {message && (
        <p role="status" className="help-text">
          {message}
        </p>
      )}
      {error && <ErrorBox message={error} />}
    </Card>
  );
}
