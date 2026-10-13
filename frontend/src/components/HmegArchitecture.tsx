import { useState } from "react";
import { researchApi } from "../api/hmeg";
import { useResource } from "../hooks/useResource";
import { Card, PageIntro, Badge, ErrorBox } from "./UI";
import { HmegFlow } from "./HmegFlow";
import { ResearchProgression } from "./ResearchProgression";
export function HmegArchitecture() {
  const history = useResource(researchApi.history),
    catalog = useResource(researchApi.catalog);
  const [selected, setSelected] = useState("");
  const records =
    history.data?.items.filter((r) => r.framework === "hmeg") ?? [];
  const result =
    records.find((r) => String(r.analysis_id) === selected) ?? records[0];
  return (
    <>
      <PageIntro
        eyebrow="PROPOSED FRAMEWORK"
        title="Hierarchical multi-expert guardrail"
        description="HMEG specializes by detection mechanism, then routes by confidence."
      />
      <ResearchProgression />
      <Card
        title="Inspect a saved HMEG decision"
        action={
          <button className="button secondary" onClick={history.reload}>
            Refresh decisions
          </button>
        }
      >
        {history.error && (
          <ErrorBox message={history.error} retry={history.reload} />
        )}
        {records.length ? (
          <select
            aria-label="Saved HMEG analysis"
            value={String(result?.analysis_id)}
            onChange={(e) => setSelected(e.target.value)}
          >
            {records.map((r) => (
              <option key={r.analysis_id} value={r.analysis_id}>
                #{r.analysis_id} · {r.prompt.slice(0, 80)}
              </option>
            ))}
          </select>
        ) : (
          <p>No HMEG decision yet. Run one in Live Prompt Analyzer.</p>
        )}
        {result && <p className="inspected-prompt">{result.prompt}</p>}
        <HmegFlow result={result} />
      </Card>
      <Card
        title="Expert implementation inspector"
        subtitle="Different detection mechanisms, not one algorithm per expert number."
      >
        {catalog.error && <ErrorBox message={catalog.error} />}
        <div className="stage-grid">
          {catalog.data?.experts.map((e) => (
            <div className="stage-card" key={e.key}>
              <Badge>Layer {e.layer}</Badge>
              <h3>{e.name}</h3>
              <p>{e.features}</p>
              <p>
                {e.estimator ?? "No fitted estimator loaded"} · {e.status}
              </p>
            </div>
          ))}
        </div>
        <p className="help-text">
          MiniLM is an optional pretrained neural representation; its classifier
          is Logistic Regression. Anomaly perplexity is optional. The
          four-expert legacy experiment remains available below.
        </p>
      </Card>
    </>
  );
}
