import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Network } from "lucide-react";
import { api } from "../api/client";
import { useResearch } from "../hooks/ResearchContext";
import { useResource } from "../hooks/useResource";
import {
  Badge,
  Card,
  DemoNote,
  ErrorBox,
  Loading,
  PageIntro,
  Term,
} from "../components/UI";
import { EnsembleFlow } from "../components/EnsembleFlow";
import { strategies } from "./Analyzer";

export function Ensemble() {
  const { latest } = useResearch();
  const catalog = useResource(api.experts);
  const history = useResource(() => api.feedback(1));
  const [selected, setSelected] = useState(0);
  const [analysisId, setAnalysisId] = useState("");
  const records = [
    ...(latest ? [latest] : []),
    ...(history.data?.items ?? []).filter(
      (r) => r.analysis_id !== latest?.analysis_id,
    ),
  ];
  const result =
    records.find((r) => String(r.analysis_id) === analysisId) ?? records[0];
  const expert = catalog.data?.experts[selected];
  const observed = result?.experts[selected];
  return (
    <>
      <PageIntro
        eyebrow="INSIDE THE DECISION"
        title="How the ensemble works"
        description="Meet the four experts, inspect their contributions, and understand the final decision."
        action={
          <Link to="/analyzer" className="button primary">
            Analyze a new prompt <ArrowUpRight size={16} />
          </Link>
        }
      />
      {catalog.error && (
        <ErrorBox message={catalog.error} retry={catalog.reload} />
      )}
      {catalog.loading && <Loading />}
      {catalog.data?.demo_mode && (
        <DemoNote>
          Demo Mode · The current experts are text-pattern scorers. Their scores
          are simulated, not calibrated probabilities or trained research
          findings. TF-IDF and trained classifiers are the intended model path.
        </DemoNote>
      )}
      <Card
        title="One representation. Four specialist decisions."
        subtitle="An ensemble combines multiple scores into one final classification."
      >
        <p className="help-text">
          The trained pipeline normalizes the prompt, transforms it with a
          shared <Term name="TF-IDF" /> vectorizer using word and character{" "}
          <Term name="N-gram" /> features, and sends that same sparse
          representation to four independent classifiers. Each returns a score
          for label 1 (jailbreak). The <Term name="Ensemble" /> engine combines
          those scores and compares the result with the chosen threshold.
        </p>
        <div
          className="expert-selector"
          role="group"
          aria-label="Inspect an expert"
        >
          {catalog.data?.experts.map((e, i) => (
            <button
              key={e.name}
              aria-pressed={selected === i}
              onClick={() => setSelected(i)}
              className={selected === i ? "selected" : ""}
            >
              <span className="expert-number">E{i + 1}</span>
              <strong>{e.name}</strong>
              <small>Default weight {(e.weight * 100).toFixed(0)}%</small>
            </button>
          ))}
        </div>
        {expert && (
          <div className="expert-explanation">
            <div>
              <Badge>Expert {selected + 1}</Badge>
              <h3>{expert.name}</h3>
              <p>{expert.purpose}</p>
              <p className="help-text">
                Current implementation: <strong>{expert.estimator}</strong>
              </p>
              <p className="help-text">
                Model artifact: <code>{expert.artifact}</code>
              </p>
            </div>
            <div>
              <h3>
                {catalog.data?.demo_mode
                  ? "How this demo score is produced"
                  : "How this trained expert is called"}
              </h3>
              {catalog.data?.demo_mode ? (
                <>
                  <p className="help-text">
                    After Unicode normalization, lowercasing, and whitespace
                    cleanup, each distinct matching substring adds 0.34 to a
                    baseline of 0.12, capped at 0.96. Repeating the same term
                    does not increase its contribution.
                  </p>
                  <div className="source-chips">
                    {expert.demo_patterns.map((p) => (
                      <Badge tone="neutral" key={p}>
                        {p}
                      </Badge>
                    ))}
                  </div>
                  <p className="mono help-text">
                    score = min(0.96, 0.12 + 0.34 × matches)
                  </p>
                  <p className="help-text">
                    These rules can misclassify benign quotations and ordinary
                    role-play. They demonstrate the interface, not detection
                    quality.
                  </p>
                </>
              ) : (
                <p className="help-text">
                  The loaded estimator receives the shared feature vector. The
                  backend selects its predict_proba output for class 1.
                  Specialization and probability calibration must be supported
                  by the model's training and evaluation records; the artifact
                  name alone does not establish them.
                </p>
              )}
            </div>
          </div>
        )}
      </Card>
      <div className="analyzer-grid">
        <div>
          <Card
            title="Inspect a saved decision"
            subtitle="Read-only results from the analyzer; no new prediction is run here."
          >
            {history.error && (
              <ErrorBox message={history.error} retry={history.reload} />
            )}
            {records.length > 0 ? (
              <>
                <label className="field-label" htmlFor="saved-analysis">
                  SAVED ANALYSIS
                </label>
                <select
                  id="saved-analysis"
                  value={String(result?.analysis_id)}
                  onChange={(e) => setAnalysisId(e.target.value)}
                >
                  {records.map((r, i) => (
                    <option
                      key={r.analysis_id ?? i}
                      value={String(r.analysis_id)}
                    >
                      #{r.analysis_id ?? "latest"} · {r.prediction} ·{" "}
                      {r.prompt.slice(0, 65)}
                    </option>
                  ))}
                </select>
                <p className="inspected-prompt">{result?.prompt}</p>
                <Badge tone={result?.demo_mode ? "amber" : "green"}>
                  {result?.demo_mode
                    ? "Saved simulated prediction"
                    : "Saved trained prediction"}
                </Badge>
                <p className="help-text">
                  {result && strategies[result.strategy]} · Threshold{" "}
                  {result?.threshold.toFixed(2)}. These settings belong to the
                  saved analysis.
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Expert</th>
                        <th>Score</th>
                        <th>
                          {result?.strategy === "weighted_average"
                            ? "Weight × score"
                            : "Vote at 0.50"}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result?.experts.map((e, i) => (
                        <tr key={e.name}>
                          <td>
                            E{i + 1} · {e.name}
                          </td>
                          <td>{e.score.toFixed(3)}</td>
                          <td>
                            {result.strategy === "weighted_average"
                              ? `${result.weights[i].toFixed(2)} × ${e.score.toFixed(3)} = ${(result.weights[i] * e.score).toFixed(3)}`
                              : e.score >= 0.5
                                ? "Jailbreak"
                                : "Benign"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {observed && (
                  <p className="help-text">
                    Selected expert E{selected + 1}: score{" "}
                    {observed.score.toFixed(3)} → {observed.prediction}. Each
                    expert uses a fixed 0.50 label threshold.
                  </p>
                )}
                <div
                  className={`result-card ${result?.label ? "blocked" : "allowed"}`}
                >
                  <Network size={24} />
                  <h2>
                    {result?.ensemble_score.toFixed(3)}{" "}
                    {result && result.ensemble_score >= result.threshold
                      ? "≥"
                      : "<"}{" "}
                    {result?.threshold.toFixed(2)}
                  </h2>
                  <Badge tone={result?.label ? "red" : "green"}>
                    {result?.prediction.toUpperCase()} →{" "}
                    {result?.action.toUpperCase()}
                  </Badge>
                  <small>No downstream LLM is connected.</small>
                </div>
              </>
            ) : (
              <p className="help-text">
                {history.loading
                  ? "Loading saved analyses…"
                  : "No saved decisions yet. Run a prompt in Live Prompt Analyzer, then return here to inspect the calculation."}
              </p>
            )}
          </Card>
          <Card
            title="How the scores are combined"
            subtitle="The decision rule is always: final score ≥ threshold → jailbreak."
          >
            <dl className="strategy-explanations">
              <dt>Weighted average · default</dt>
              <dd>
                0.30 × E1 + 0.20 × E2 + 0.20 × E3 + 0.30 × E4. These are
                configured demonstration weights, not empirically optimized
                weights.
              </dd>
              <dt>Average probability</dt>
              <dd>
                (E1 + E2 + E3 + E4) / 4. Every expert has equal influence.
              </dd>
              <dt>Majority voting</dt>
              <dd>
                Count experts with score ≥ 0.50, then divide by four. The
                configurable final threshold applies to that fraction; at 0.50,
                a two-to-two tie is flagged.
              </dd>
              <dt>Maximum expert confidence</dt>
              <dd>
                Use the largest jailbreak score. This selects the strongest
                jailbreak signal, not the most confident prediction of either
                class.
              </dd>
            </dl>
          </Card>
        </div>
        <Card
          title="Decision flow"
          subtitle={
            result?.demo_mode
              ? "Saved demo result · feature extraction is illustrative"
              : "Shared features → expert scores → ensemble decision"
          }
        >
          <EnsembleFlow result={result} stage={result ? 7 : -1} />
        </Card>
      </div>
      <Card
        title="What makes an expert specialized?"
        subtitle="A training design to implement and validate, not a claim that these models are already trained."
      >
        <p className="help-text">
          Build a documented training set for each attack category with
          appropriate benign examples and hard negatives. Fit the shared
          vectorizer only on training data, train classical classifiers such as
          logistic regression or calibrated SVMs, tune weights and thresholds on
          validation data, and report results on an untouched test set. Expert
          numbers indicate roles, not fixed classifier algorithms.
        </p>
        <p className="help-text">
          For example, the roleplay expert needs both malicious persona attacks
          and harmless role-play. The suffix expert needs representative suffix
          attacks; punctuation keywords alone cannot establish this specialty.
          Audit category coverage before training. Imported CSVs and reviewed
          prompt feedback supply candidate data; adding rows does not
          automatically retrain or validate the models.
        </p>
      </Card>
    </>
  );
}
