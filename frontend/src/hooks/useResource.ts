import { useEffect, useState } from "react";
export function useResource<T>(loader: () => Promise<T>, key = "") {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    setFetching(true);
    setError("");
    loader()
      .then((value) => {
        if (current) setData(value);
      })
      .catch((e) => {
        if (current)
          setError(e instanceof Error ? e.message : "Could not load data");
      })
      .finally(() => {
        if (current) setFetching(false);
      });
    return () => {
      current = false;
    };
  }, [key, retry]);
  // Only the first request replaces empty content. Subsequent requests keep the
  // previous rows mounted so pagination, focus, and scroll remain stable.
  return {
    data,
    error,
    fetching,
    loading: fetching && data === undefined,
    reload: () => setRetry((r) => r + 1),
  };
}
