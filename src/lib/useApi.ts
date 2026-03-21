"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseApiOptions = {
  /** Skip initial fetch (manual trigger only) */
  skip?: boolean;
};

/**
 * Generic hook for fetching data from API routes.
 * Replaces useLocalStorage with server-backed state.
 */
export function useApi<T>(
  url: string,
  initialData: T,
  options?: UseApiOptions
): {
  data: T;
  setData: React.Dispatch<React.SetStateAction<T>>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(!options?.skip);
  const [error, setError] = useState<string | null>(null);

  // Abort controller로 stale fetch 정리
  const abortRef = useRef<AbortController | null>(null);
  const hasFetchedUrlRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    // 이전 fetch 취소
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // 같은 URL로 이미 fetch한 경우 loading 표시하지 않음 (refetch 시 깜빡임 방지)
    if (hasFetchedUrlRef.current !== url) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(url, { signal: controller.signal, credentials: "include" });
      if (!res.ok) {
        // 401 → 세션 만료, 로그인 페이지로 리다이렉트
        if (res.status === 401 && typeof window !== "undefined") {
          window.location.href = "/login";
          return;
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      if (!controller.signal.aborted) {
        setData(json);
        hasFetchedUrlRef.current = url;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [url]);

  useEffect(() => {
    if (!options?.skip) {
      fetchData();
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData, options?.skip]);

  return { data, setData, loading, error, refetch: fetchData };
}

/** Helper for POST/PUT/DELETE mutations */
export async function apiMutate<T = unknown>(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      // 401 → 세션 만료, 로그인 페이지로 리다이렉트
      if (res.status === 401 && typeof window !== "undefined") {
        window.location.href = "/login";
        return { data: null, error: "세션이 만료되었습니다. 다시 로그인해주세요." };
      }
      return { data: null, error: json.error || `HTTP ${res.status}` };
    }
    return { data: json as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
