import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useResource } from "../hooks/useResource";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
describe("resource lifecycle", () => {
  it("keeps existing data mounted while a new page loads", async () => {
    const next = deferred<string>();
    const loader = vi
      .fn()
      .mockResolvedValueOnce("page one")
      .mockReturnValueOnce(next.promise);
    const { result, rerender } = renderHook(
      ({ page }) => useResource(loader, page),
      { initialProps: { page: "1" } },
    );
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe("page one"));
    rerender({ page: "2" });
    expect(result.current.data).toBe("page one");
    expect(result.current.loading).toBe(false);
    expect(result.current.fetching).toBe(true);
    await act(async () => next.resolve("page two"));
    expect(result.current.data).toBe("page two");
    expect(result.current.fetching).toBe(false);
  });
  it("ignores late responses after filters change", async () => {
    const old = deferred<string>();
    const loader = vi
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce("new filter");
    const { result, rerender } = renderHook(
      ({ key }) => useResource(loader, key),
      { initialProps: { key: "old" } },
    );
    rerender({ key: "new" });
    await waitFor(() => expect(result.current.data).toBe("new filter"));
    await act(async () => old.resolve("stale"));
    expect(result.current.data).toBe("new filter");
  });
  it("retains content on refresh failure and retries successfully", async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce("cached")
      .mockRejectedValueOnce(Error("offline"))
      .mockResolvedValueOnce("recovered");
    const { result } = renderHook(() => useResource(loader));
    await waitFor(() => expect(result.current.data).toBe("cached"));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.error).toBe("offline"));
    expect(result.current.data).toBe("cached");
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toBe("recovered"));
    expect(result.current.error).toBe("");
  });
  it("does not refetch when only the loader closure identity changes", async () => {
    const call = vi.fn().mockResolvedValue("ready");
    const { rerender } = renderHook(() => useResource(() => call(), "same"));
    await waitFor(() => expect(call).toHaveBeenCalledTimes(1));
    rerender();
    expect(call).toHaveBeenCalledTimes(1);
  });
});
