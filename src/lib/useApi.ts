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
  const mountedRef = useRef(true);

  const hasFetchedRef = useRef(false);
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    // 각 fetch에 고유 ID를 부여해서 stale response 무시
    const id = ++fetchIdRef.current;
    // 초기 로딩만 loading=true, refetch 시에는 기존 데이터 유지 (깜빡임 방지)
    if (!hasFetchedRef.current) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      // stale response인 경우 무시 (URL 변경 후 이전 fetch 결과)
      if (mountedRef.current && id === fetchIdRef.current) {
        setData(json);
      }
    } catch (err) {
      if (mountedRef.current && id === fetchIdRef.current) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      if (mountedRef.current && id === fetchIdRef.current) {
        hasFetchedRef.current = true;
        setLoading(false);
      }
    }
  }, [url]);

  useEffect(() => {
    mountedRef.current = true;
    if (!options?.skip) {
      fetchData();
    }
    return () => {
      mountedRef.current = false;
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
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
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
