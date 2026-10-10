import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DatasetExplorer } from "../pages/DatasetExplorer";
import { api } from "../api/client";
vi.mock("../api/client", () => ({ api: { samples: vi.fn() } }));
vi.mock("../hooks/ResearchContext", () => ({
  useResearch: () => ({
    stats: {
      data: {
        total: 24,
        benign: 12,
        jailbreak: 12,
        demo_mode: true,
        splits: { train: 16, validation: 3, test: 5 },
        split_status: "planned",
        sources: [{ name: "Synthetic demonstration", value: 24 }],
        categories: [
          { name: "benign", value: 12 },
          { name: "roleplay", value: 3 },
        ],
        class_distribution: [],
      },
    },
  }),
}));
vi.mock("../charts/ResearchCharts", () => ({
  DistributionChart: () => <div>Distribution chart</div>,
}));
const row = (id: number) => ({
  id,
  prompt: `Prompt number ${id}`,
  label: 0,
  class_name: "benign",
  source: "Synthetic demonstration",
  category: "benign",
});
beforeEach(() => {
  vi.mocked(api.samples).mockReset();
  vi.mocked(api.samples).mockImplementation(async (p) => ({
    items: [row(Number(p.get("page")))],
    total: 24,
    demo_mode: true,
  }));
});
describe("dataset browsing", () => {
  it("does not remove the table or pagination while requesting another page", async () => {
    render(<DatasetExplorer />);
    await screen.findByText("Prompt number 1");
    const table = screen.getByRole("table");
    const next = screen.getByRole("button", { name: "Next page" });
    let resolve!: (v: any) => void;
    vi.mocked(api.samples).mockImplementationOnce(
      () => new Promise((r) => (resolve = r)),
    );
    fireEvent.click(next);
    expect(screen.getByRole("table")).toBe(table);
    expect(screen.getByText("Prompt number 1")).toBeVisible();
    expect(next).toBeDisabled();
    expect(screen.getByText("Updating results…")).toBeVisible();
    await act(async () =>
      resolve({ items: [row(2)], total: 24, demo_mode: true }),
    );
    expect(screen.getByRole("table")).toBe(table);
    expect(screen.getByText("Prompt number 2")).toBeVisible();
    expect(next).toBeEnabled();
  });
  it("applies all filters and resets pagination to the first page", async () => {
    render(<DatasetExplorer />);
    await screen.findByText("Prompt number 1");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await screen.findByText("Prompt number 2");
    fireEvent.change(screen.getByLabelText("Filter class"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Filter source"), {
      target: { value: "Synthetic demonstration" },
    });
    fireEvent.change(screen.getByLabelText("Filter category"), {
      target: { value: "roleplay" },
    });
    fireEvent.change(screen.getByLabelText("Search prompts"), {
      target: { value: "pretend" },
    });
    await waitFor(() => {
      const p = vi.mocked(api.samples).mock.calls.at(-1)![0];
      expect(Object.fromEntries(p)).toMatchObject({
        page: "1",
        label: "1",
        source: "Synthetic demonstration",
        category: "roleplay",
        search: "pretend",
      });
    });
  });
  it("keeps rows visible and offers retry when pagination fails", async () => {
    render(<DatasetExplorer />);
    await screen.findByText("Prompt number 1");
    vi.mocked(api.samples).mockRejectedValueOnce(Error("API offline"));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await screen.findByText("API offline");
    expect(screen.getByText("Prompt number 1")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("Prompt number 2");
  });
  it("handles no matching records and disables next", async () => {
    vi.mocked(api.samples).mockResolvedValue({
      items: [],
      total: 0,
      demo_mode: true,
    });
    render(<DatasetExplorer />);
    await screen.findByText("No prompts match these filters.");
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
  });
  it("stops pagination at the final page", async () => {
    render(<DatasetExplorer />);
    await screen.findByText("Prompt number 1");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await screen.findByText("Prompt number 2");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await screen.findByText("Prompt number 3");
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    await screen.findByText("Prompt number 2");
  });
});
