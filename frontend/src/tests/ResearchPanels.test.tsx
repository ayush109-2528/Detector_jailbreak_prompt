import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { TrainingPipeline } from "../pages/TrainingPipeline";
import { ResearchInfo } from "../pages/ResearchInfo";
import { MemoryRouter } from "react-router-dom";
vi.mock("../components/ResearchExperiments", () => ({
  ResearchExperiments: () => null,
}));
vi.mock("../hooks/ResearchContext", () => ({
  useResearch: () => ({
    stats: {
      data: {
        split_status: "recorded",
        splits: { train: 795, validation: 107, test: 113 },
      },
    },
  }),
}));
it("shows imported split assignments and distinguishes them from completed training", () => {
  render(
    <MemoryRouter>
      <TrainingPipeline />
    </MemoryRouter>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Train \/ validation \/ test split/ }),
  );
  expect(
    screen.getByRole("heading", {
      name: "Stage 5 · Train / validation / test split",
    }),
  ).toBeVisible();
  expect(
    screen.getAllByText(
      "Recorded CSV split: 795 train / 107 validation / 113 test",
    ),
  ).toHaveLength(2);
  expect(screen.getByText(/not evidence of completed training/)).toBeVisible();
  expect(
    screen.getByRole("button", { name: /Train \/ validation \/ test split/ }),
  ).toHaveAttribute("aria-pressed", "true");
});
it("provides actual explanations for every research metric tooltip", () => {
  render(
    <MemoryRouter>
      <ResearchInfo />
    </MemoryRouter>,
  );
  const tooltips = screen.getAllByRole("tooltip", { hidden: true });
  expect(tooltips).toHaveLength(10);
  for (const tooltip of tooltips)
    expect(tooltip.textContent!.length).toBeGreaterThan(35);
  expect(screen.getByText(/proposed trained system/)).toBeInTheDocument();
});
