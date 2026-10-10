import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrainingFeedback } from "../components/TrainingFeedback";
import { api } from "../api/client";
vi.mock("../api/client", () => ({
  api: { feedback: vi.fn(), review: vi.fn() },
}));
const history = {
  items: [
    {
      analysis_id: 1,
      prompt: "Explain cloud computing.",
      created_at: "2026-10-10T00:00:00Z",
      label: 0,
      prediction: "benign",
      ensemble_score: 0.12,
      threshold: 0.95,
      demo_mode: true,
      reviewed_label: null,
      reviewed_category: null,
    },
  ],
  total: 8,
  unique_prompts: 8,
  reviewed_prompts: 0,
  pending_prompts: 8,
};
beforeEach(() => {
  vi.mocked(api.feedback)
    .mockReset()
    .mockResolvedValue(history as any);
  vi.mocked(api.review).mockReset().mockResolvedValue({ saved: true });
});
describe("training feedback", () => {
  it("keeps saved rows mounted during pagination", async () => {
    render(<TrainingFeedback />);
    await screen.findByText("Explain cloud computing.");
    const table = screen.getByRole("table");
    let done!: (v: any) => void;
    vi.mocked(api.feedback).mockImplementationOnce(
      () => new Promise((r) => (done = r)),
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("table")).toBe(table);
    expect(screen.getByText("Explain cloud computing.")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Next" }),
    ).toBeDisabled();
    await act(async () => done(history));
    expect(screen.getByRole("table")).toBe(table);
  });
  it("saves explicit labels and refreshes without discarding the table", async () => {
    render(<TrainingFeedback />);
    await screen.findByText("Explain cloud computing.");
    fireEvent.click(screen.getByRole("button", { name: "Review #1" }));
    fireEvent.change(screen.getByLabelText("Reviewed class and category"), {
      target: { value: "general" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save reviewed label" }),
    );
    await screen.findByText(
      "Reviewed label saved. This prompt is now included in the training CSV.",
    );
    expect(api.review).toHaveBeenCalledWith(1, 1, "general");
    expect(screen.getByText("Explain cloud computing.")).toBeVisible();
  });
  it("cancels a review without changing labels", async () => {
    render(<TrainingFeedback />);
    await screen.findByText("Explain cloud computing.");
    fireEvent.click(screen.getByRole("button", { name: "Review #1" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(api.review).not.toHaveBeenCalled();
    expect(
      screen.queryByLabelText("Reviewed class and category"),
    ).not.toBeInTheDocument();
  });
  it("reports save failure without falsely reporting success", async () => {
    vi.mocked(api.review).mockRejectedValue(Error("Save failed"));
    render(<TrainingFeedback />);
    await screen.findByText("Explain cloud computing.");
    fireEvent.click(screen.getByRole("button", { name: "Review #1" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Save reviewed label" }),
    );
    await screen.findByText("Save failed");
    expect(screen.getByLabelText("Reviewed class and category")).toBeVisible();
    expect(screen.queryByText(/Reviewed label saved/)).not.toBeInTheDocument();
  });
  it("exports through a download link without navigating the app", async () => {
    render(<TrainingFeedback />);
    await screen.findByText("Explain cloud computing.");
    const link = screen.getByRole("link", { name: "Export reviewed CSV" });
    expect(link).toHaveAttribute("href", "/api/training/examples.csv");
    expect(link).toHaveAttribute("download");
  });
});
