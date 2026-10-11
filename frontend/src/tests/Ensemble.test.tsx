import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { Ensemble } from "../pages/Ensemble";
import { api } from "../api/client";
import type { Prediction } from "../types";
vi.mock("../api/client", () => ({
  api: { experts: vi.fn(), feedback: vi.fn() },
}));
vi.mock("../hooks/ResearchContext", () => ({
  useResearch: () => ({ latest: undefined }),
}));
const experts = [
  "Instruction Override Expert",
  "Roleplay Expert",
  "Adversarial Suffix Expert",
  "General Jailbreak Expert",
].map((name, i) => ({
  name,
  category: "test",
  weight: [0.3, 0.2, 0.2, 0.3][i],
  purpose: `Purpose ${i + 1}`,
  demo_patterns: ["ignore"],
  artifact: `expert_${i}.pkl`,
  estimator: "Simulated text-pattern scorer",
}));
const result: Prediction = {
  analysis_id: 1,
  prompt: "Saved prompt",
  normalized_prompt: "saved prompt",
  prediction: "benign",
  label: 0,
  action: "allow",
  ensemble_score: 0.12,
  threshold: 0.95,
  strategy: "weighted_average",
  weights: [0.3, 0.2, 0.2, 0.3],
  demo_mode: true,
  mode_note: "Demo",
  experts: experts.map((e) => ({
    name: e.name,
    category: e.category,
    score: 0.12,
    prediction: "benign",
  })),
  processing_steps: [],
  inference_time_ms: 1,
};
beforeEach(() => {
  vi.mocked(api.experts).mockResolvedValue({
    demo_mode: true,
    mode_note: "Demo",
    experts,
  });
  vi.mocked(api.feedback).mockResolvedValue({
    items: [
      {
        ...result,
        analysis_id: 1,
        created_at: "today",
        reviewed_label: null,
        reviewed_category: null,
      },
    ],
    total: 1,
    unique_prompts: 1,
    reviewed_prompts: 0,
    pending_prompts: 1,
  });
});
it("inspects saved results and expert roles without duplicating the analyzer", async () => {
  render(
    <MemoryRouter>
      <Ensemble />
    </MemoryRouter>,
  );
  expect(await screen.findByText("Saved prompt")).toBeInTheDocument();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /Analyze a new prompt/ }),
  ).toHaveAttribute("href", "/analyzer");
  expect(screen.getAllByText("0.30 × 0.120 = 0.036")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: /Roleplay Expert/ }));
  expect(screen.getByText("Purpose 2")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /Roleplay Expert/ }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText(/Threshold 0.95/)).toBeInTheDocument();
});
it("shows an honest empty state before any prediction exists", async () => {
  vi.mocked(api.feedback).mockResolvedValue({
    items: [],
    total: 0,
    unique_prompts: 0,
    reviewed_prompts: 0,
    pending_prompts: 0,
  });
  render(
    <MemoryRouter>
      <Ensemble />
    </MemoryRouter>,
  );
  expect(await screen.findByText(/No saved decisions yet/)).toBeInTheDocument();
  expect(screen.queryByLabelText("SAVED ANALYSIS")).not.toBeInTheDocument();
});
