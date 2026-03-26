"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseApiOptions = {
  /** Skip initial fetch (manual trigger only) */
  skip?: boolean;
};

/** 글로벌 URL 캐시 (60초 TTL) */
const urlCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60_000;

/** 테스트용 캐시 초기화 */
export function clearApiCache() { urlCache.clear(); }

/**
 * Generic hook for fetching data from API routes.
 * - SSR initialData 지원 (skip=true 시 fetch 안 함)
 * - 글로벌 캐시로 같은 URL 중복 요청 방지
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

  const abortRef = useRef<AbortController | null>(null);
  const hasFetchedUrlRef = useRef<string | null>(null);

  const fetchData = useCallback(async (ignoreCache = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // 캐시 확인 (강제 refetch가 아닌 경우)
    if (!ignoreCache) {
      const cached = urlCache.get(url);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        if (!controller.signal.aborted) {
          setData(cached.data as T);
          setLoading(false);
          hasFetchedUrlRef.current = url;
        }
        return;
      }
    }

    if (hasFetchedUrlRef.current !== url) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(url, { signal: controller.signal, credentials: "include" });
      if (!res.ok) {
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
        urlCache.set(url, { data: json, ts: Date.now() });
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

  // refetch는 캐시 무시
  const refetch = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    if (!options?.skip) {
      fetchData();
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData, options?.skip]);

  // 앱 복귀 시 자동 갱신 (30초 이내면 skip)
  useEffect(() => {
    if (options?.skip) return;

    let lastRefresh = Date.now();

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRefresh < 30_000) return;
      lastRefresh = Date.now();
      fetchData(true);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchData, options?.skip]);

  return { data, setData, loading, error, refetch };
}

/** Helper for POST/PUT/DELETE mutations — 관련 캐시 무효화 */
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
      if (res.status === 401 && typeof window !== "undefined") {
        window.location.href = "/login";
        return { data: null, error: "세션이 만료되었습니다. 다시 로그인해주세요." };
      }
      return { data: null, error: json.error || `HTTP ${res.status}` };
    }
    // mutation 성공 시 해당 URL 기반 캐시 무효화
    const baseUrl = url.split("?")[0];
    for (const key of urlCache.keys()) {
      if (key.startsWith(baseUrl)) {
        urlCache.delete(key);
      }
    }
    return { data: json as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
