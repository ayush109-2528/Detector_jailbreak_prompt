import { useState } from "react";
import { api, request, API_BASE, researcherHeaders } from "../api/client";
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
  const learning = useResource(
    () =>
      request<{
        enabled: boolean;
        state: string;
        updated_at: string | null;
        included: number;
        excluded_holdout: number;
        interval_seconds: number;
        deployment?: string;
      }>("/learning/status"),
    `${revision}`,
  );
  async function download() {
    try {
      const response = await fetch(`${API_BASE}/training/examples.csv`, {
        headers: researcherHeaders(),
      });
      if (!response.ok)
        throw new Error(
          "Researcher access required to export reviewed prompts.",
        );
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "reviewed_training_examples.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
  }
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
        "Reviewed label saved. The learning worker can include this correction in its next validated training cycle.",
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
        <button className="button secondary" onClick={download}>
          Export reviewed CSV
        </button>
      }
    >
      <p className="help-text">
        Predictions are observations, not correct labels. Only your reviewed
        labels enter recurring training. Fixed evaluation prompts are excluded;
        a candidate replaces the active detector only after passing validation.
      </p>
      <p className="help-text">
        Learning worker:{" "}
        {learning.data?.enabled
          ? learning.data.state.replaceAll("_", " ")
          : "not enabled"}
        .
        {learning.data?.enabled &&
          ` Checks approximately every ${Math.round(learning.data.interval_seconds / 60)} minutes. ${learning.data.included} reviewed prompts included; ${learning.data.excluded_holdout} excluded to protect evaluation.`}
        {learning.data?.updated_at &&
          ` Last heartbeat: ${new Date(learning.data.updated_at).toLocaleString()}.`}
      </p>
      <button className="button secondary" onClick={learning.reload}>
        Refresh learning status
      </button>
      {learning.data?.deployment&&<p className="help-text">Model deployment: {learning.data.deployment.replaceAll('_',' ')}. A locally prepared model is not live until Vercel deployment succeeds.</p>}
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
                      {row.ensemble_score.toFixed(3)} /{" "}
                      {row.framework === "hmeg"
                        ? "decision layer " + row.decision_layer
                        : "threshold " + row.threshold.toFixed(2)}{" "}
                      · {row.demo_mode ? "Demo" : "Trained"}
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
