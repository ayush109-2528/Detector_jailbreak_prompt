import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { PythonCode } from "../pages/PythonCode";
afterEach(() => vi.useRealTimers());
describe("code copy controls", () => {
  it("does not let an earlier copy timer clear a later confirmation", async () => {
    vi.useFakeTimers();
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: write },
    });
    render(<PythonCode />);
    fireEvent.click(
      screen.getByRole("button", { name: "Copy Dataset and provenance" }),
    );
    await act(async () => {});
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    fireEvent.click(
      screen.getByRole("button", { name: "Copy Flat ensemble versus HMEG" }),
    );
    await act(async () => {});
    await act(async () => vi.advanceTimersByTimeAsync(900));
    expect(screen.getByText("Copied", { exact: true })).toBeVisible();
    expect(write).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(
      screen.queryByText("Copied", { exact: true }),
    ).not.toBeInTheDocument();
  });
  it("shows manual copy guidance when browser clipboard access fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(Error("Denied")) },
    });
    render(<PythonCode />);
    fireEvent.click(
      screen.getByRole("button", { name: "Copy Dataset and provenance" }),
    );
    await screen.findByText(
      "Clipboard unavailable. Select and copy the snippet manually.",
    );
    expect(
      screen.queryByText("Copied", { exact: true }),
    ).not.toBeInTheDocument();
  });
});
