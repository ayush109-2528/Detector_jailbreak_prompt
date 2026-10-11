import type {
  ExpertCatalog,
  Metrics,
  Prediction,
  Sample,
  Stats,
  Strategy,
} from "../types";
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail =
        typeof body.detail === "string"
          ? body.detail
          : JSON.stringify(body.detail);
    } catch {
      /* Non-JSON gateway error. */
    }
    throw new Error(
      detail ||
        `API request failed (${response.status}). Check that FastAPI is running on port 8000.`,
    );
  }
  return response.json();
}
export const api = {
  experts: () => request<ExpertCatalog>("/experts"),
  feedback: (page: number) =>
    request<{
      items: (Prediction & {
        analysis_id: number;
        created_at: string;
        reviewed_label: number | null;
        reviewed_category: string | null;
      })[];
      total: number;
      unique_prompts: number;
      reviewed_prompts: number;
      pending_prompts: number;
      page?: number;
    }>(`/feedback?page=${page}&page_size=5`),
  review: (id: number, label: number, category: string) =>
    request<{ saved: boolean }>(`/feedback/${id}`, {
      method: "POST",
      body: JSON.stringify({ label, category }),
    }),
  stats: () => request<Stats>("/dataset/stats"),
  metrics: () => request<Metrics>("/models/metrics"),
  health: () =>
    request<{ status: string; demo_mode: boolean; mode_note: string }>(
      "/health",
    ),
  samples: (params: URLSearchParams) =>
    request<{
      items: Sample[];
      total: number;
      demo_mode: boolean;
      page?: number;
    }>(`/dataset/samples?${params}`),
  predict: (prompt: string, strategy: Strategy, threshold: number) =>
    request<Prediction>("/predict/detailed", {
      method: "POST",
      body: JSON.stringify({ prompt, strategy, threshold }),
    }),
};
