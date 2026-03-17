import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useLocalStorage } from "@/lib/useLocalStorage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("초기값이 없으면 initialValue 사용 + localStorage에 저장", async () => {
    const { result } = renderHook(() =>
      useLocalStorage("test-key", { count: 0 })
    );

    await waitFor(() => expect(result.current[2]).toBe(true)); // ready

    expect(result.current[0]).toEqual({ count: 0 });
    expect(JSON.parse(localStorage.getItem("test-key")!)).toEqual({ count: 0 });
  });

  it("기존 localStorage 값 불러오기", async () => {
    localStorage.setItem("existing-key", JSON.stringify({ count: 42 }));

    const { result } = renderHook(() =>
      useLocalStorage("existing-key", { count: 0 })
    );

    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0]).toEqual({ count: 42 });
  });

  it("값 업데이트 시 localStorage에도 저장", async () => {
    const { result } = renderHook(() =>
      useLocalStorage("update-key", "initial")
    );

    await waitFor(() => expect(result.current[2]).toBe(true));

    act(() => {
      result.current[1]("updated");
    });

    await waitFor(() => {
      expect(result.current[0]).toBe("updated");
    });

    expect(JSON.parse(localStorage.getItem("update-key")!)).toBe("updated");
  });

  it("잘못된 JSON은 initialValue로 폴백", async () => {
    localStorage.setItem("bad-json-key", "not-valid-json{");

    const { result } = renderHook(() =>
      useLocalStorage("bad-json-key", ["fallback"])
    );

    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0]).toEqual(["fallback"]);
  });

  it("ready 상태는 마운트 후 true가 됨", async () => {
    const { result } = renderHook(() =>
      useLocalStorage("ready-key", null)
    );

    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[2]).toBe(true);
  });

  it("숫자 타입 저장/불러오기", async () => {
    const { result } = renderHook(() =>
      useLocalStorage("number-key", 0)
    );

    await waitFor(() => expect(result.current[2]).toBe(true));

    act(() => result.current[1](99));

    await waitFor(() => {
      expect(result.current[0]).toBe(99);
    });
    expect(JSON.parse(localStorage.getItem("number-key")!)).toBe(99);
  });
});
