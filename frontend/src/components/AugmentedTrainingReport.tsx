import { request } from "../api/client";
import { useResource } from "../hooks/useResource";
import { Card } from "./UI";
type Result = {
  samples: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  fpr: number | null;
  roc_auc: number | null;
};
type Report = {
  dataset: string;
  version: string;
  synthetic_rows: number;
  activated: boolean;
  validation: Result;
  test: Result;
  original_only_test: Result | null;
};
export function AugmentedTrainingReport() {
  const data = useResource(() =>
    request<{ report: Report | null }>("/learning/dataset-report"),
  );
  const r = data.data?.report;
  if (!r) return null;
  return (
    <Card
      title="Augmented dataset training run"
      subtitle={`${r.dataset} · initial model ${r.version}`}
    >
      <p className="help-text">
        {r.synthetic_rows.toLocaleString()} rows are synthetic augmentations.
        Parent families remain separate. This is the initial fitted-model
        evaluation, not a claim about later review-trained versions.{" "}
        {r.activated
          ? "Passed initial validation gate."
          : "Candidate did not pass activation gate."}
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Partition</th>
              <th>Samples</th>
              <th>Accuracy</th>
              <th>Precision</th>
              <th>Recall</th>
              <th>F1</th>
              <th>FPR</th>
              <th>ROC-AUC</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["Validation", r.validation],
                ["Untouched test", r.test],
                ["Original-only test", r.original_only_test],
              ] as [string, Result | null][]
            )
              .filter(([, v]) => v)
              .map(([label, v]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{v!.samples.toLocaleString()}</td>
                  {(
                    [
                      "accuracy",
                      "precision",
                      "recall",
                      "f1",
                      "fpr",
                      "roc_auc",
                    ] as const
                  ).map((k) => (
                    <td key={k}>
                      {v![k] === null ? "N/A" : v![k]!.toFixed(4)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
