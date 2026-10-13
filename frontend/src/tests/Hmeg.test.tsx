import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi, beforeEach } from "vitest";
import { HmegAnalyzer } from "../components/HmegAnalyzer";
import { HmegFlow } from "../components/HmegFlow";
import { researchApi } from "../api/hmeg";
vi.mock("../api/hmeg", () => ({
  researchApi: { catalog: vi.fn(), config: vi.fn(), predict: vi.fn() },
}));
vi.mock("../components/TrainingFeedback", () => ({
  TrainingFeedback: () => null,
}));
const routing = {
  low_threshold: 0.2,
  high_threshold: 0.8,
  lexical_weight: 0.5,
  threshold: 0.5,
};
const result: any = {
  analysis_id: 1,
  prompt: "Explain clouds",
  prediction: "benign",
  label: 0,
  action: "allow",
  framework: "hmeg",
  final_probability: 0.12,
  fast_score: 0.12,
  meta_classifier_score: null,
  decision_layer: 1,
  routed_to_layer_2: false,
  routing_decision: "benign",
  routing_thresholds: routing,
  experts_executed: 2,
  total_inference_time_ms: 1,
  demo_mode: true,
  reduced_expert_set: false,
  mode_note: "Demo Mode",
  experts: ["lexical", "obfuscation", "semantic", "anomaly", "instruction"].map(
    (key, i) => ({
      key,
      name: key,
      score: i < 2 ? 0.12 : null,
      status: i < 2 ? "simulated" : "skipped",
      inference_time_ms: i < 2 ? 0.2 : 0,
    }),
  ),
};
beforeEach(() => {
  vi.mocked(researchApi.catalog).mockResolvedValue({
    trained: false,
    training_available: true,
    preferred_meta: null,
    unavailable: {},
    experts: [],
  });
  vi.mocked(researchApi.config).mockResolvedValue(routing);
  vi.mocked(researchApi.predict).mockReset().mockResolvedValue(result);
});
it("highlights only the experts that actually executed", () => {
  const { container } = render(<HmegFlow result={result} />);
  expect(container.querySelectorAll(".hmeg-expert.executed")).toHaveLength(2);
  expect(container.querySelectorAll('[data-status="skipped"]')).toHaveLength(3);
  expect(screen.getByText("Decision completed at Layer 1")).toBeVisible();
  expect(screen.getByText("Not executed")).toBeVisible();
});
it("validates routing and sends the selected configuration; handles a stale result", async () => {
  render(
    <MemoryRouter>
      <HmegAnalyzer />
    </MemoryRouter>,
  );
  await waitFor(() => expect(researchApi.config).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText("PROMPT INPUT"), {
    target: { value: "Explain clouds" },
  });
  fireEvent.change(screen.getByLabelText("Low threshold"), {
    target: { value: ".9" },
  });
  expect(screen.getByRole("button", { name: "Analyze prompt" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Low threshold"), {
    target: { value: ".2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Analyze prompt" }));
  await waitFor(() =>
    expect(researchApi.predict).toHaveBeenCalledWith(
      "hmeg",
      expect.objectContaining({ prompt: "Explain clouds", routing }),
    ),
  );
  await screen.findByText("Demo Mode");
  fireEvent.change(screen.getByLabelText("PROMPT INPUT"), {
    target: { value: "changed" },
  });
  expect(screen.getByText(/Input or settings changed/)).toBeVisible();
});
