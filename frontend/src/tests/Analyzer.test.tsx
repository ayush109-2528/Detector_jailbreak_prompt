import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { Analyzer } from "../pages/Analyzer";
import { api } from "../api/client";
vi.mock("../api/client", () => ({ api: { predict: vi.fn() } }));
vi.mock("../hooks/ResearchContext", () => ({
  useResearch: () => ({
    save: vi.fn(),
    latest: undefined,
    health: { data: { demo_mode: true } },
  }),
}));
vi.mock("../components/TrainingFeedback", () => ({
  TrainingFeedback: () => <div>Training collection</div>,
}));
const response = {
  prompt: "test",
  normalized_prompt: "test",
  prediction: "benign",
  label: 0,
  action: "allow",
  ensemble_score: 0.12,
  threshold: 0.5,
  strategy: "weighted_average",
  weights: [0.3, 0.2, 0.2, 0.3],
  demo_mode: true,
  mode_note: "Simulation",
  experts: Array.from({ length: 4 }, (_, i) => ({
    name: `Expert ${i + 1}`,
    category: "general",
    score: 0.12,
    prediction: "benign",
  })),
  processing_steps: [],
  inference_time_ms: 1,
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(api.predict)
    .mockReset()
    .mockResolvedValue(response as any);
});
afterEach(() => vi.useRealTimers());
function mount() {
  render(
    <MemoryRouter>
      <Analyzer />
    </MemoryRouter>,
  );
}
async function finish() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2500);
  });
}
describe("live analyzer", () => {
  it("rejects blank input and enforces the character limit", () => {
    mount();
    expect(
      screen.getByRole("button", { name: "Analyze prompt" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    expect(
      screen.getByRole("button", { name: "Analyze prompt" }),
    ).toBeDisabled();
    expect(screen.getByRole("textbox")).toHaveAttribute("maxlength", "10000");
  });
  it("loads both examples and clears the input", () => {
    mount();
    fireEvent.click(
      screen.getByRole("button", { name: "Load example benign prompt" }),
    );
    expect(screen.getByRole("textbox")).toHaveValue(
      "Explain how cloud computing helps a small business.",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Load example jailbreak prompt" }),
    );
    expect(
      (screen.getByRole("textbox") as HTMLTextAreaElement).value,
    ).toContain("Ignore previous instructions");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
  it("submits the chosen strategy and threshold, and shows the completed decision", async () => {
    mount();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "test" },
    });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "maximum_confidence" },
    });
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0.95" } });
    fireEvent.click(screen.getByRole("button", { name: "Analyze prompt" }));
    expect(api.predict).toHaveBeenCalledWith(
      "test",
      "maximum_confidence",
      0.95,
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
    await finish();
    expect(
      screen.getByRole("heading", { name: "Benign prompt" }),
    ).toBeVisible();
    expect(screen.getByRole("textbox")).toBeEnabled();
  });
  it("shows a stale-result notice when input changes after analysis", async () => {
    mount();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze prompt" }));
    await finish();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "another prompt" },
    });
    expect(screen.getByText(/Input or settings changed/)).toBeVisible();
  });
  it("handles API failure without fabricating a result", async () => {
    vi.mocked(api.predict).mockRejectedValue(Error("Inference unavailable"));
    mount();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze prompt" }));
    await finish();
    expect(screen.getByText("Inference unavailable")).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Benign prompt" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analyze prompt" }),
    ).toBeEnabled();
  });
});
