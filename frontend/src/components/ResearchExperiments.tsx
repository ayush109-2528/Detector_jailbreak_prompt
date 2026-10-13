import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { researchApi } from "../api/hmeg";
import { api } from "../api/client";
import { useResource } from "../hooks/useResource";
import { Badge, Card, ErrorBox, DemoNote } from "./UI";
import { RoutingControls } from "./RoutingControls";
import type { Experiment, RoutingConfig } from "../types/hmeg";

const planned = [
  ["single", "Logistic Regression"],
  ["single", "SVM"],
  ["single", "Random Forest"],
  ["single", "XGBoost"],
  ["single", "Semantic-only model"],
  ["single", "Character N-Gram model"],
  ["single", "Anomaly detector"],
  ["expert", "Lexical Expert"],
  ["expert", "Obfuscation Expert"],
  ["expert", "Semantic Intent Expert"],
  ["expert", "Adversarial / Anomaly Expert"],
  ["expert", "Instruction Manipulation Expert"],
  ["flat", "Flat Majority Ensemble"],
  ["flat", "Flat Average Ensemble"],
  ["flat", "Flat Weighted Ensemble"],
  ["flat", "Flat Meta Logistic Regression"],
  ["flat", "Flat Meta XGBoost"],
  ["hmeg", "HMEG"],
];
const metricNames: Record<string, string> = {
  accuracy: "Accuracy",
  precision: "Precision",
  recall: "Recall",
  f1: "F1",
  roc_auc: "ROC-AUC",
  fpr: "FPR",
  fnr: "FNR",
  average_inference_time: "Average latency (ms)",
  p95_inference_time: "P95 latency (ms)",
};
export function ResearchExperiments({
  trainingOnly = false,
}: {
  trainingOnly?: boolean;
}) {
  const catalog = useResource(researchApi.catalog),
    stats = useResource(api.stats),
    records = useResource(researchApi.experiments);
  const defaults = useResource(researchApi.config);
  const [partition, setPartition] = useState("validation");
  const [sources, setSources] = useState<string[]>([]),
    [heldout, setHeldout] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [kind, setKind] = useState("comparison"),
    [metric, setMetric] = useState("f1"),
    [run, setRun] = useState("");
  const [selected, setSelected] = useState<Experiment>();
  const [routing, setRouting] = useState<RoutingConfig>({
    low_threshold: 0.2,
    high_threshold: 0.8,
    lexical_weight: 0.5,
    threshold: 0.5,
  });
  const [expert, setExpert] = useState("all-experts");
  useEffect(() => {
    if (defaults.data) setRouting(defaults.data);
  }, [defaults.data]);
  const all = records.data?.items ?? [];
  const filtered = all.filter(
    (e) => e.study === kind && e.schema_version === 2,
  );
  const runs = [...new Set(filtered.map((e) => e.run_id))];
  const activeRun = runs.includes(run) ? run : runs[0];
  const displayed = filtered.filter((e) => e.run_id === activeRun);
  async function train() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await researchApi.train(expert, {
        training_sources: sources.length ? sources : null,
      });
      setMessage(JSON.stringify(response, null, 2));
      catalog.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Training failed");
    } finally {
      setBusy(false);
    }
  }
  async function evaluate() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await researchApi.evaluate(kind, {
        training_sources: sources,
        held_out_source: heldout || null,
        partition,
        routing,
        threshold_pairs: [
          [routing.low_threshold, routing.high_threshold],
          [0.1, 0.9],
          [0.2, 0.8],
          [0.3, 0.7],
        ],
      });
      setMessage(response.items.length + " measured experiment records saved.");
      setRun(response.items[0]?.run_id ?? "");
      records.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setBusy(false);
    }
  }
  async function saveRouting() {
    setError("");
    try {
      await researchApi.saveConfig(routing);
      setMessage(
        "Default routing saved. This does not establish optimal thresholds.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save routing");
    }
  }
  return (
    <>
      <Card
        title={
          trainingOnly ? "Train research models" : "HMEG experiment workspace"
        }
        subtitle="Uses your imported CSVs, including any declared synthetic augmentations. Evaluation results are measured, never fabricated."
      >
        <DemoNote>
          Base experts and meta-classifiers use disjoint training partitions.
          Routing sweeps use validation; comparisons and ablations use the
          selected partition. Repeatedly inspecting test results does not
          preserve an untouched final holdout.
        </DemoNote>
        {(catalog.error || records.error || stats.error) && (
          <ErrorBox message={catalog.error || records.error || stats.error} />
        )}
        <label className="field-label">
          Training sources (none selected = all sources for standard training)
        </label>
        <div className="source-chips">
          {stats.data?.sources.map((s) => (
            <label className="source-choice" key={s.name}>
              <input
                type="checkbox"
                disabled={busy}
                checked={sources.includes(s.name)}
                onChange={(e) =>
                  setSources((p) =>
                    e.target.checked
                      ? [...p, s.name]
                      : p.filter((v) => v !== s.name),
                  )
                }
              />
              {s.name}
            </label>
          ))}
        </div>
        <div className="settings-grid">
          <label>
            Training target
            <select
              value={expert}
              disabled={busy}
              onChange={(e) => setExpert(e.target.value)}
            >
              <option value="all-experts">
                All experts + meta-classifiers + baselines
              </option>
              <option value="flat-ensemble">
                Flat ensemble and dependencies
              </option>
              <option value="hmeg">HMEG and dependencies</option>
              {catalog.data?.experts.map((e) => (
                <option key={e.key} value={"expert/" + e.key}>
                  {e.name} only
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="button-row">
          <button
            className="button primary"
            onClick={train}
            disabled={busy || !catalog.data?.training_available}
          >
            {busy ? "Research operation running…" : "Train selected models"}
          </button>
          <button
            className="button secondary"
            onClick={() => {
              records.reload();
              catalog.reload();
            }}
            disabled={busy}
          >
            Refresh artifacts and results
          </button>
        </div>
        <p className="help-text">
          Training and batch evaluations run locally. Hosted Vercel serves
          predictions and persisted results. Semantic encoding requires optional
          MiniLM dependencies and cached weights. Without them, trained HMEG
          explicitly uses a reduced expert set.
        </p>
        {catalog.data && (
          <p className="help-text">
            Meta preference: {catalog.data.preferred_meta ?? "Not fitted"} ·{" "}
            {catalog.data.trained ? "Fitted artifacts loaded" : "Not trained"}
          </p>
        )}
        {Object.entries(catalog.data?.unavailable ?? {}).map(([k, v]) => (
          <p key={k} className="help-text">
            {k}: {v}
          </p>
        ))}
        {error && <ErrorBox message={error} />}
        {message && (
          <pre className="hmeg-json" role="status">
            {message}
          </pre>
        )}
      </Card>
      {!trainingOnly && (
        <>
          <Card
            title="Run an evaluation"
            subtitle="Saved experiments include source selection, split fingerprints, hyperparameters, timing and ROC points."
          >
            <div className="settings-grid">
              <label>
                Experiment type
                <select
                  disabled={busy}
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value);
                    setSelected(undefined);
                  }}
                >
                  <option value="comparison">A → B → C → D comparison</option>
                  <option value="routing">Routing experiment</option>
                  <option value="ablation">Ablation study</option>
                  <option value="ood">OOD source holdout</option>
                </select>
              </label>
              {(kind === "comparison" || kind === "ablation") && (
                <label>
                  Evaluation partition
                  <select
                    value={partition}
                    disabled={busy}
                    onChange={(e) => setPartition(e.target.value)}
                  >
                    <option value="validation">
                      Validation · development checks
                    </option>
                    <option value="test">
                      Test · final held-out evaluation
                    </option>
                  </select>
                </label>
              )}
              {kind === "ood" && (
                <label>
                  Held-out test source
                  <select
                    disabled={busy}
                    value={heldout}
                    onChange={(e) => setHeldout(e.target.value)}
                  >
                    <option value="">Select unseen source</option>
                    {stats.data?.sources.map((s) => (
                      <option key={s.name} disabled={sources.includes(s.name)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {kind === "ood" && (
              <p className="help-text">
                Select explicit training sources above. The held-out source is
                excluded from all fitting and model selection. Both classes are
                required for fitting and validation. Single-class held-out tests
                report undefined metrics as N/A. Source holdout does not
                necessarily mean category holdout.
              </p>
            )}
            <RoutingControls
              value={routing}
              disabled={busy}
              onChange={setRouting}
            />
            <div className="button-row">
              <button
                className="button secondary"
                disabled={
                  busy || routing.low_threshold >= routing.high_threshold
                }
                onClick={saveRouting}
              >
                Save default routing
              </button>
              <button
                className="button primary"
                disabled={
                  busy ||
                  !catalog.data?.training_available ||
                  routing.low_threshold >= routing.high_threshold ||
                  (kind !== "ood" && !catalog.data?.trained) ||
                  (kind === "ood" &&
                    (!heldout || !sources.length || sources.includes(heldout)))
                }
                onClick={evaluate}
              >
                Run {kind} evaluation
              </button>
            </div>
            <p className="help-text">
              Routing sweeps include your low/high pair plus (0.10,0.90),
              (0.20,0.80), (0.30,0.70). Flat weighted fusion uses documented
              fixed weights. Missing integrations have no invented metrics.
            </p>
          </Card>
          <Card
            title="Measured experiment results"
            subtitle="Select one run to avoid combining incompatible datasets or configurations."
          >
            <div className="settings-grid">
              <label>
                Saved run
                <select
                  value={activeRun ?? ""}
                  onChange={(e) => {
                    setRun(e.target.value);
                    setSelected(undefined);
                  }}
                >
                  {runs.map((r) => (
                    <option key={r} value={r}>
                      {filtered.find((e) => e.run_id === r)?.timestamp} ·{" "}
                      {r?.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Chart metric
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                >
                  {Object.entries(metricNames).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {displayed.length > 0 && (
              <ResponsiveContainer
                width="100%"
                height={Math.max(330, displayed.length * 32)}
              >
                <BarChart
                  layout="vertical"
                  data={displayed.map((e) => ({
                    name: e.model_name,
                    value: e.metrics[metric],
                  }))}
                >
                  <CartesianGrid stroke="var(--border)" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={190}
                    tick={{ fontSize: 10 }}
                    interval={0}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    name={metricNames[metric]}
                    fill="#596de6"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Level / model</th>
                    <th>Status</th>
                    {Object.values(metricNames).map((n) => (
                      <th key={n}>{n}</th>
                    ))}
                    <th>Model size (MB)</th>
                    <th>Inspect</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.length
                    ? displayed.map((e) => (
                        <tr key={e.experiment_id}>
                          <td>
                            {e.model_type} · {e.model_name}
                          </td>
                          <td>
                            <Badge>
                              {e.reduced_expert_set
                                ? "Reduced set"
                                : "Measured"}
                            </Badge>
                          </td>
                          {Object.keys(metricNames).map((k) => (
                            <td key={k}>
                              {e.metrics[k] == null
                                ? "N/A"
                                : Number(e.metrics[k]).toFixed(3)}
                            </td>
                          ))}
                          <td>{(e.model_size_bytes / 1e6).toFixed(2)}</td>
                          <td>
                            <button
                              className="button secondary"
                              onClick={() => setSelected(e)}
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    : planned.map(([level, name]) => (
                        <tr key={level + name}>
                          <td>
                            {level} · {name}
                          </td>
                          <td>
                            <Badge tone="neutral">Not evaluated</Badge>
                          </td>
                          <td colSpan={11}>No measured results loaded</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
            {selected && (
              <>
                <h3>
                  {selected.model_name} · {selected.partition} ·{" "}
                  {selected.samples} samples
                </h3>
                <p className="help-text">{selected.evaluation_note}</p>
                <div className="source-chips">
                  {[
                    "layer1_exit_rate",
                    "layer2_routing_rate",
                    "average_experts_executed",
                    "average_layer1_time",
                    "average_layer2_time",
                  ].map((k) => (
                    <Badge key={k}>
                      {k.replaceAll("_", " ")}:{" "}
                      {selected.metrics[k]?.toFixed(3) ?? "N/A"}
                    </Badge>
                  ))}
                </div>
                <div className="two-columns">
                  <div className="confusion">
                    <h3>Actual rows / predicted columns: benign, jailbreak</h3>
                    <div className="matrix">
                      {selected.confusion_matrix.flat().map((n, i) => (
                        <div
                          key={i}
                          className={
                            i === 0 || i === 3 ? "correct" : "incorrect"
                          }
                        >
                          <small>{["TN", "FP", "FN", "TP"][i]}</small>
                          <strong>{n}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={selected.roc_data}>
                      <XAxis
                        dataKey="fpr"
                        type="number"
                        domain={[0, 1]}
                        name="FPR"
                      />
                      <YAxis domain={[0, 1]} name="TPR" />
                      <Tooltip />
                      <Line dataKey="tpr" stroke="#596de6" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <details>
                  <summary>Full experiment provenance / JSON</summary>
                  <pre className="hmeg-json">
                    {JSON.stringify(selected, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </Card>
          {kind === "routing" && (
            <div className="two-columns">
              {[
                ["f1", "F1"],
                ["fpr", "FPR"],
                ["average_inference_time", "Latency (ms)"],
                ["layer2_routing_rate", "Layer 2 routing rate"],
              ].map(([key, name]) => (
                <Card key={key} title={"Threshold pair vs " + name}>
                  <ResponsiveContainer width="100%" height={230}>
                    <LineChart
                      data={displayed.map((e) => ({
                        pair:
                          e.routing_thresholds.low_threshold +
                          "/" +
                          e.routing_thresholds.high_threshold,
                        value: e.metrics[key],
                      }))}
                    >
                      <XAxis dataKey="pair" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        dataKey="value"
                        name={name}
                        stroke="#596de6"
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
