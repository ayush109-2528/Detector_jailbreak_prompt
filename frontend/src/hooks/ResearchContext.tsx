import { createContext, useContext, useState, type ReactNode } from "react";
import { api } from "../api/client";
import { useResource } from "./useResource";
import type { Prediction } from "../types";
function useResearchState() {
  const stats = useResource(api.stats),
    metrics = useResource(api.metrics),
    health = useResource(api.health);
  const [recent, setRecent] = useState<Prediction[]>([]);
  return {
    stats,
    metrics,
    health,
    recent,
    latest: recent[0],
    reconnect: () => {
      stats.reload();
      metrics.reload();
      health.reload();
    },
    save: (result: Prediction) =>
      setRecent((items) => [result, ...items].slice(0, 20)),
  };
}
const Context = createContext<ReturnType<typeof useResearchState> | null>(null);
export function ResearchProvider({ children }: { children: ReactNode }) {
  const value = useResearchState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useResearch() {
  const value = useContext(Context);
  if (!value) throw Error("ResearchProvider missing");
  return value;
}
