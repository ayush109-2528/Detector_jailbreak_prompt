import { useState } from "react";
import { useResearch } from "../hooks/ResearchContext";
import {
  Card,
  PageIntro,
  Badge,
  DemoNote,
  Loading,
  ErrorBox,
  Term,
} from "../components/UI";
import { ModelChart } from "../charts/ResearchCharts";
import type { ModelMetric } from "../types";
import { ResearchExperiments } from "../components/ResearchExperiments";
import { ResearchProgression } from "../components/ResearchProgression";
import { LiteratureComparison } from "../components/LiteratureComparison";
import { AugmentedTrainingReport } from "../components/AugmentedTrainingReport";
const metricNames = {
  accuracy: "Accuracy",
  precision: "Precision",
  recall: "Recall",
  f1: "F1",
  roc_auc: "ROC-AUC",
  fpr: "False Positive Rate",
  inference_time_ms: "Inference Time",
};
export function ModelComparison() {
  return (
    <>
      <PageIntro
        eyebrow="A → B → C → D"
        title="Model comparison"
        description="Standalone guardrails, specialized experts, flat fusion, and proposed HMEG."
      />
      <ResearchProgression />
      <Card title="Where are the other guardrails?">
        <p className="body-copy">
          Local standalone models and specialized experts appear in the measured
          experiment table. Llama Guard, NeMo Guardrails, MoJE, RigorLLM and
          EGuard are literature comparisons only; they are not integrated or
          benchmarked here.
        </p>
        <a href="#known-guardrails">View known guardrail comparison ↓</a>
      </Card>
      <AugmentedTrainingReport />
      <ResearchExperiments />
      <section id="known-guardrails" style={{ scrollMarginTop: 90 }}>
        <LiteratureComparison />
      </section>
      <details>
        <summary>Legacy comparison charts and metrics</summary>
        <LegacyModelComparison />
      </details>
    </>
  );
}
export function LegacyModelComparison() {
  const { metrics } = useResearch();
  const [metric, setMetric] = useState("accuracy");
  if (metrics.error)
    return <ErrorBox message={metrics.error} retry={metrics.reload} />;
  if (!metrics.data) return <Loading />;
  const data = metrics.data;
  return (
    <>
      <PageIntro
        eyebrow="EVALUATION & BENCHMARKS"
        title="Model comparison"
        description="Compare detection quality, false positives, and computational cost."
        action={
          <Badge tone={data.demo_mode ? "amber" : "green"}>
            {data.demo_mode
              ? "DEMO / MOCK RESULTS"
              : "Loaded evaluation results"}
          </Badge>
        }
      />
      <DemoNote>{data.evaluation_note}</DemoNote>
      <Card
        title="Performance overview"
        subtitle="Select a metric to inspect all baselines, experts, and the final ensemble."
        action={
          <select
            aria-label="Comparison metric"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            {Object.entries(metricNames).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        }
      >
        <ModelChart data={data.models} metric={metric} />
      </Card>
      <Card
        title="Evaluation metrics"
        subtitle={
          data.demo_mode
            ? "Demo Data · All values are illustrative"
            : "Metrics loaded from backend/trained_models/metrics.json"
        }
      >
        <div className="table-scroll">
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Model</th>
                {Object.values(metricNames).map((n) => (
                  <th key={n}>
                    <Term name={n} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.models.map((m) => (
                <tr
                  className={m.name === "Final Ensemble" ? "highlight-row" : ""}
                  key={m.name}
                >
                  <td>
                    {m.name}
                    {m.name === "Final Ensemble" && <Badge>ENSEMBLE</Badge>}
                  </td>
                  {Object.keys(metricNames).map((key) => (
                    <td key={key}>
                      {m[key as keyof ModelMetric] === null
                        ? "N/A"
                        : key === "inference_time_ms"
                          ? `${m.inference_time_ms.toFixed(1)} ms`
                          : `${(Number(m[key as keyof ModelMetric]) * 100).toFixed(1)}%`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="two-columns">
        <Card
          title="Accuracy, precision, recall & F1"
          subtitle={
            data.demo_mode
              ? "Demo Data · Baseline and ensemble comparison"
              : "Baseline and ensemble comparison"
          }
        >
          <ModelChart
            data={data.models.filter((m) => !m.name.startsWith("Expert"))}
            grouped
          />
        </Card>
        <Card
          title="Inference time"
          subtitle="Milliseconds per prompt · lower is faster"
        >
          <ModelChart data={data.models} metric="inference_time_ms" />
        </Card>
      </div>
      <Card
        title="ROC-AUC comparison"
        subtitle="Area under the ROC curve · this chart compares scalar AUC values, not ROC curves"
      >
        <ModelChart data={data.models} metric="roc_auc" />
      </Card>
      <Card
        title="Confusion matrices"
        subtitle="Rows: actual class · Columns: predicted class · Order: Benign, Jailbreak"
      >
        <div className="confusion-grid">
          {data.models.map((m) => (
            <div className="confusion" key={m.name}>
              <h3>{m.name}</h3>
              <div className="matrix-axis">Predicted → Benign / Jailbreak</div>
              <div className="matrix">
                {m.confusion_matrix.flat().map((n, i) => (
                  <div
                    key={i}
                    className={i === 0 || i === 3 ? "correct" : "incorrect"}
                  >
                    <small>{["TN", "FP", "FN", "TP"][i]}</small>
                    <strong>{n}</strong>
                  </div>
                ))}
              </div>
              <small>
                {data.demo_mode ? "Demo Data" : "Loaded evaluation"} · actual
                benign ↑ / jailbreak ↓
              </small>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
