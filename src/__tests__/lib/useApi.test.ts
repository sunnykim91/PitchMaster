import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useApi, apiMutate } from "@/lib/useApi";

// fetch 전역 모킹
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockJsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

// ─── useApi ──────────────────────────────────────────────────────────────────
describe("useApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("초기에 initialData를 data로 사용", () => {
    const initialData = { items: [1, 2, 3] };
    mockFetch.mockResolvedValue(mockJsonResponse({ items: [4, 5] }));

    const { result } = renderHook(() =>
      useApi("/api/test", initialData, { skip: true })
    );
    expect(result.current.data).toEqual(initialData);
  });

  it("skip:true이면 fetch 호출하지 않음", async () => {
    const { result } = renderHook(() =>
      useApi("/api/test", { data: null }, { skip: true })
    );
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("skip:false이면 마운트 시 fetch 호출", async () => {
    const responseData = { matches: [] };
    mockFetch.mockResolvedValue(mockJsonResponse(responseData));

    const { result } = renderHook(() =>
      useApi("/api/matches", { matches: [] })
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/matches");
    expect(result.current.data).toEqual(responseData);
    expect(result.current.error).toBeNull();
  });

  it("HTTP 에러 시 error 상태 설정", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ error: "Unauthorized" }, 401));

    const { result } = renderHook(() =>
      useApi("/api/protected", { data: null })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Unauthorized");
    expect(result.current.data).toEqual({ data: null }); // initialData 유지
  });

  it("네트워크 에러 시 error 상태 설정", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() =>
      useApi("/api/test", { data: null })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
  });

  it("refetch 호출 시 데이터 재조회", async () => {
    const firstData = { count: 1 };
    const secondData = { count: 2 };
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse(firstData))
      .mockResolvedValueOnce(mockJsonResponse(secondData));

    const { result } = renderHook(() =>
      useApi("/api/test", { count: 0 })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(firstData);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data).toEqual(secondData);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("서버 에러 응답에서 error 필드 추출", async () => {
    mockFetch.mockResolvedValue(
      mockJsonResponse({ error: "DB connection failed" }, 503)
    );

    const { result } = renderHook(() =>
      useApi("/api/test", { data: null })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("DB connection failed");
  });
});

// ─── apiMutate ───────────────────────────────────────────────────────────────
describe("apiMutate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST 성공 — data 반환, error null", async () => {
    const responseData = { id: "new-match" };
    mockFetch.mockResolvedValue(mockJsonResponse(responseData));

    const result = await apiMutate("/api/matches", "POST", { date: "2025-04-01" });
    expect(result.data).toEqual(responseData);
    expect(result.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/matches",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2025-04-01" }),
      })
    );
  });

  it("PUT 요청 지원", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ updated: true }));
    await apiMutate("/api/matches/1", "PUT", { status: "COMPLETED" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/matches/1",
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("DELETE 요청 — body 없이 전송", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse({ deleted: true }));
    await apiMutate("/api/matches/1", "DELETE");
    const call = mockFetch.mock.calls[0];
    expect(call[1].method).toBe("DELETE");
    expect(call[1].headers).toBeUndefined();
    expect(call[1].body).toBeUndefined();
  });

  it("서버 에러 — error 반환, data null", async () => {
    mockFetch.mockResolvedValue(
      mockJsonResponse({ error: "Insufficient permissions" }, 403)
    );

    const result = await apiMutate("/api/matches", "POST", {});
    expect(result.data).toBeNull();
    expect(result.error).toBe("Insufficient permissions");
  });

  it("네트워크 에러 처리", async () => {
    mockFetch.mockRejectedValue(new Error("fetch failed"));

    const result = await apiMutate("/api/matches", "POST", {});
    expect(result.data).toBeNull();
    expect(result.error).toBe("fetch failed");
  });

  it("HTTP 상태 코드만 있고 error 필드 없는 경우", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    const result = await apiMutate("/api/test", "POST", {});
    expect(result.error).toBe("HTTP 500");
  });
});
