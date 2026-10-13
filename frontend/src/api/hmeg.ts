import { request } from "./client";
import type {
  HmegCatalog,
  HmegResult,
  RoutingConfig,
  Experiment,
} from "../types/hmeg";
export const researchApi = {
  catalog: () => request<HmegCatalog>("/research/catalog"),
  config: () => request<RoutingConfig>("/routing/config"),
  saveConfig: (config: RoutingConfig) =>
    request<RoutingConfig>("/routing/config", {
      method: "PUT",
      body: JSON.stringify(config),
    }),
  history: () => request<{ items: HmegResult[] }>("/feedback?page_size=100"),
  experiments: () => request<{ items: Experiment[] }>("/research/experiments"),
  predict: (path: string, body: unknown) =>
    request<HmegResult>("/predict/" + path, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  train: (target: string, body: unknown) =>
    request<Record<string, unknown>>("/train/" + target, {
      method: "POST",
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(600000),
    }),
  evaluate: (kind: string, body: unknown) =>
    request<{ items: Experiment[] }>("/evaluate/" + kind, {
      method: "POST",
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(600000),
    }),
};
