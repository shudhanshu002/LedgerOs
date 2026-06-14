import { useCallback, useEffect, useState } from "react";

type AsyncStatus = "idle" | "loading" | "success" | "error";

type UseAsyncOptions = {
  immediate?: boolean;
};

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  options: UseAsyncOptions = { immediate: true },
) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [error, setError] = useState<string>("");

  const execute = useCallback(async () => {
    setStatus("loading");
    setError("");

    try {
      const result = await asyncFunction();

      setData(result);
      setStatus("success");

      return result;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong.";

      setError(message);
      setStatus("error");

      throw caughtError;
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setData(null);
    setStatus("idle");
    setError("");
  }, []);

  useEffect(() => {
    if (options.immediate) {
      execute().catch(() => {
        // Error state is already handled inside execute.
      });
    }
  }, [execute, options.immediate]);

  return {
    data,
    status,
    error,
    loading: status === "loading",
    success: status === "success",
    failed: status === "error",
    execute,
    reset,
    setData,
  };
}