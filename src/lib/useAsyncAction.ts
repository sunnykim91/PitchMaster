"use client";

import { useState, useCallback, useRef } from "react";

/**
 * 비동기 액션의 로딩/중복방지를 공통 처리하는 훅
 *
 * @example
 * const [run, loading] = useAsyncAction();
 *
 * <button disabled={loading} onClick={() => run(async () => {
 *   await apiMutate(...);
 *   showToast("완료");
 * })}>
 *   {loading ? "처리 중..." : "저장"}
 * </button>
 */
export function useAsyncAction() {
  const [loading, setLoading] = useState(false);
  const lockRef = useRef(false);

  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (lockRef.current) return undefined;
    lockRef.current = true;
    setLoading(true);
    try {
      return await fn();
    } finally {
      setLoading(false);
      lockRef.current = false;
    }
  }, []);

  return [run, loading] as const;
}

/**
 * 특정 ID별 로딩 상태를 관리하는 훅 (리스트 아이템별 로딩)
 *
 * @example
 * const [runFor, loadingId] = useItemAction();
 *
 * <select disabled={!!loadingId} onChange={() => runFor(item.id, async () => {
 *   await apiMutate(...);
 * })}>
 * {loadingId === item.id && <Spinner />}
 */
export function useItemAction() {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const runFor = useCallback(async <T>(id: string, fn: () => Promise<T>): Promise<T | undefined> => {
    if (loadingId) return undefined;
    setLoadingId(id);
    try {
      return await fn();
    } finally {
      setLoadingId(null);
    }
  }, [loadingId]);

  return [runFor, loadingId] as const;
}
