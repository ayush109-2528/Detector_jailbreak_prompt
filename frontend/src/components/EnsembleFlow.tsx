import {
  ArrowDown,
  FileText,
  ScanText,
  Network,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Badge, Term } from "./UI";
import type { Prediction } from "../types";
export const stageNames = [
  "Prompt received",
  "Preprocessing",
  "Text normalization",
  "TF-IDF transformation",
  "N-gram extraction",
  "Expert analysis",
  "Ensemble decision",
  "Final classification",
];
export function EnsembleFlow({
  result,
  stage = -1,
}: {
  result?: Prediction;
  stage?: number;
}) {
  return (
    <div className="ensemble-flow">
      <div className={`flow-node ${stage === 0 ? "active" : ""}`}>
        <FileText size={18} />
        <b>User prompt</b>
        <small>
          {result
            ? `${result.prompt.length} characters`
            : "Enter a prompt in the analyzer"}
        </small>
      </div>
      <ArrowDown className="connector" />
      <div
        className={`flow-node ${stage === 1 || stage === 2 ? "active" : ""}`}
      >
        <ScanText size={18} />
        <b>Preprocessing</b>
        <small>Normalize text · clean whitespace</small>
      </div>
      <ArrowDown className="connector" />
      <div
        className={`flow-node ${stage === 3 || stage === 4 ? "active" : ""}`}
      >
        <Network size={18} />
        <b>
          <Term name="TF-IDF" /> + <Term name="N-gram" />
        </b>
        <small>Shared sparse feature representation</small>
      </div>
      <div className="branch-line" />
      <div className="experts-grid">
        {[
          "Instruction override",
          "Role-playing attack",
          "Adversarial suffix",
          "General jailbreak",
        ].map((name, i) => (
          <div
            key={name}
            className={`expert-node ${stage === 5 ? "active" : ""}`}
          >
            <span className="expert-number">E{i + 1}</span>
            <small>EXPERT {i + 1}</small>
            <h3>{name}</h3>
            <strong>{result ? result.experts[i].score.toFixed(3) : "—"}</strong>
            <div className="score-track">
              <div
                style={{ width: `${(result?.experts[i].score || 0) * 100}%` }}
              />
            </div>
            <small>
              {result ? result.experts[i].prediction : "Awaiting analysis"}
            </small>
          </div>
        ))}
      </div>
      <div className="branch-line bottom" />
      <div className={`flow-node ${stage === 6 ? "active" : ""}`}>
        <SlidersHorizontal size={18} />
        <b>
          <Term name="Ensemble" /> engine
        </b>
        <small>
          {result
            ? result.strategy.replaceAll("_", " ")
            : "Weighted average · 30 / 20 / 20 / 30%"}
        </small>
      </div>
      <ArrowDown className="connector" />
      <div className={`flow-node final-node ${stage === 7 ? "active" : ""}`}>
        <ShieldCheck size={18} />
        <b>
          {result
            ? `${result.prediction.toUpperCase()} · ${result.action.toUpperCase()}`
            : "Final classification"}
        </b>
        <small>
          {result
            ? `Score ${result.ensemble_score.toFixed(3)} · threshold ${result.threshold.toFixed(2)}`
            : "Benign → Allow  /  Jailbreak → Block"}
        </small>
        {result && (
          <Badge tone={result.demo_mode ? "amber" : "green"}>
            {result.demo_mode ? "Simulated decision" : "Trained model output"}
          </Badge>
        )}
      </div>
    </div>
  );
}
