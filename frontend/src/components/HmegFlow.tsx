import type { HmegResult } from "../types/hmeg";
import { Badge, Card } from "./UI";
const definitions = [
  [
    "lexical",
    "Lexical Expert",
    "Word TF-IDF 1–2 grams → Logistic Regression. Obvious jailbreak wording.",
  ],
  [
    "obfuscation",
    "Obfuscation Expert",
    "Character 3–5 grams + case, spacing, symbol and digit ratios → Logistic Regression.",
  ],
  [
    "semantic",
    "Semantic Intent Expert",
    "MiniLM sentence embeddings → Logistic Regression. Optional local pretrained encoder.",
  ],
  [
    "anomaly",
    "Adversarial / Anomaly Expert",
    "Entropy, length, repetition, prefix/suffix statistics → XGBoost (LR fallback). Optional perplexity.",
  ],
  [
    "instruction",
    "Instruction Manipulation Expert",
    "Word TF-IDF 1–3 grams + hierarchy, persona and replacement indicators → Logistic Regression.",
  ],
];
export function HmegFlow({
  result,
  busy = false,
}: {
  result?: HmegResult;
  busy?: boolean;
}) {
  const expert = (key: string) => {
    const d = definitions.find((x) => x[0] === key)!;
    const observed = result?.experts.find((e) => e.key === key);
    const ran =
      observed?.status === "executed" || observed?.status === "simulated";
    return (
      <div
        key={key}
        className={"hmeg-expert " + (ran ? "executed" : "")}
        data-status={observed?.status ?? "pending"}
      >
        <strong>{d[1]}</strong>
        <Badge tone={ran ? "blue" : "neutral"}>
          {observed?.status ?? "Ready"}
        </Badge>
        <p>{d[2]}</p>
        <b>{observed?.score == null ? "—" : observed.score.toFixed(3)}</b>
        <small>
          {ran
            ? observed!.inference_time_ms.toFixed(2) + " ms"
            : "No execution time"}
        </small>
      </div>
    );
  };
  return (
    <div className="hmeg-flow" aria-label="HMEG execution trace">
      <div className={"flow-node " + (busy ? "active" : "")}>
        User prompt → preprocessing
        {busy && <small> Waiting for backend trace…</small>}
      </div>
      <div className="flow-arrow">↓</div>
      <Card title="Layer 1 · Fast screening">
        <div className="hmeg-experts">
          {["lexical", "obfuscation"].map(expert)}
        </div>
      </Card>
      <div className="flow-arrow">↓</div>
      <div className="flow-node">
        <b>Confidence router</b>
        <p>
          Fast score: {result?.fast_score?.toFixed(3) ?? "—"} · low{" "}
          {result?.routing_thresholds.low_threshold ?? "—"} / high{" "}
          {result?.routing_thresholds.high_threshold ?? "—"}
        </p>
        <small>
          score ≤ low → benign · score ≥ high → jailbreak · otherwise → Layer 2
        </small>
      </div>
      <div className="hmeg-branches">
        <div
          className={
            "flow-node " + (result?.decision_layer === 1 ? "active" : "")
          }
        >
          <b>Confident → decision</b>
          <p>
            {result?.decision_layer === 1
              ? "Decision completed at Layer 1"
              : "No early decision recorded"}
          </p>
        </div>
        <div>
          <div className="flow-arrow">Uncertain ↓</div>
          <Card title="Layer 2 · Deeper analysis">
            <div className="hmeg-experts">
              {["semantic", "anomaly", "instruction"].map(expert)}
            </div>
          </Card>
          <div className="flow-node">
            <b>Layer 3 · Learned meta-classifier</b>
            <p>
              {result?.meta_classifier_score == null
                ? "Not executed"
                : result.meta_classifier_score.toFixed(3)}
            </p>
            <small>
              {result?.demo_mode
                ? "Demo fusion is simulated, not trained."
                : "XGBoost primary · Logistic Regression alternative. Fusion uses available fitted expert scores."}
            </small>
          </div>
        </div>
      </div>
      {result && (
        <div
          className={"result-card " + (result.label ? "blocked" : "allowed")}
        >
          <Badge tone={result.demo_mode ? "amber" : "blue"}>
            {result.demo_mode ? "SIMULATED RESULT" : "TRAINED RESEARCH OUTPUT"}
          </Badge>
          <h2>
            {result.prediction.toUpperCase()} · {result.action.toUpperCase()}
          </h2>
          <p>
            Final {result.demo_mode ? "score" : "probability"}:{" "}
            {result.final_probability.toFixed(3)} · Decision layer{" "}
            {result.decision_layer}
          </p>
          <p>
            {result.experts_executed} experts executed ·{" "}
            {result.total_inference_time_ms.toFixed(2)} ms
          </p>
          {result.reduced_expert_set && (
            <p>Reduced expert set: an optional expert is unavailable.</p>
          )}
        </div>
      )}
    </div>
  );
}
