import { Badge, Card } from "./UI";
const systems = [
  {
    name: "Llama Guard",
    type: "Single classifier",
    specialization: "LLM-based safety taxonomy",
    routing: "Not HMEG-style",
    fusion: "No expert fusion",
    light: "LLM-dependent",
    url: "https://dev.meta.ai/llama/docs/model-cards-and-prompt-formats/llama-guard-3",
  },
  {
    name: "NeMo Guardrails",
    type: "Multi-component framework",
    specialization: "Configurable input, output and dialog rails",
    routing: "Configuration-dependent",
    fusion: "Integration-dependent",
    light: "Configuration-dependent",
    url: "https://docs.nvidia.com/nemo/guardrails/about-nemo-guardrails-library/overview",
  },
  {
    name: "MoJE",
    type: "Multiple classifiers",
    specialization: "Jailbreak datasets / categories and linguistic statistics",
    routing: "Not established here",
    fusion: "See paper",
    light: "Lightweight classifiers",
    url: "https://arxiv.org/abs/2409.17699",
  },
  {
    name: "RigorLLM",
    type: "Multi-component framework",
    specialization: "Robust moderation and jailbreak defense",
    routing: "Not established here",
    fusion: "See paper",
    light: "Component-dependent",
    url: "https://arxiv.org/abs/2403.13031",
  },
  {
    name: "EGuard",
    type: "Multiple existing guardrails",
    specialization: "Guardrail outputs",
    routing: "Not HMEG-style",
    fusion: "XGBoost learned fusion",
    light: "Base-guardrail dependent",
    url: "https://www.ndss-symposium.org/wp-content/uploads/2026-s1062-paper.pdf",
  },
];
export function LiteratureComparison() {
  return (
    <Card
      title="Known guardrail comparison"
      subtitle="Qualitative literature context only. No external system has been integrated or benchmarked here."
    >
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {[
                "System",
                "Single / Multi-component",
                "Specialization strategy",
                "Hierarchical routing",
                "Learned fusion",
                "Lightweight",
                "Implemented here?",
              ].map((n) => (
                <th key={n}>{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {systems.map((s) => (
              <tr key={s.name}>
                <td>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.name} ↗
                  </a>
                </td>
                <td>{s.type}</td>
                <td>{s.specialization}</td>
                <td>{s.routing}</td>
                <td>{s.fusion}</td>
                <td>{s.light}</td>
                <td>
                  <Badge tone="neutral">Literature Comparison Only</Badge>
                </td>
              </tr>
            ))}
            <tr className="highlight-row">
              <td>HMEG</td>
              <td>Multi-expert hierarchy</td>
              <td>Detection mechanism</td>
              <td>Yes</td>
              <td>Yes · after fitting</td>
              <td>To be measured; optional neural encoder</td>
              <td>
                <Badge>Implemented</Badge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="help-text">
        EGuard refers to the ensemble defense in DualBreach, not the similarly
        named embedding-inversion defense. “Not established here” means this
        comparison does not assert the property from the source. HMEG
        implementation is not evidence of superior performance.
      </p>
    </Card>
  );
}
