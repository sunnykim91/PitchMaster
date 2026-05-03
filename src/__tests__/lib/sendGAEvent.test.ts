import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendServerGAEvent } from "@/lib/server/sendGAEvent";

function makeRequest(cookies: Record<string, string> = {}): unknown {
  return {
    cookies: {
      get(name: string) {
        const value = cookies[name];
        return value ? { name, value } : undefined;
      },
    },
  };
}

describe("sendServerGAEvent", () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchSpy);
    fetchSpy.mockReset();
    fetchSpy.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GA4_API_SECRET;
  });

  it("API_SECRET 미설정 시 silent return — fetch 미호출", async () => {
    delete process.env.GA4_API_SECRET;
    const req = makeRequest({ _ga: "GA1.1.1234567890.1700000000" });

    await sendServerGAEvent(req as never, [{ name: "signup_complete" }]);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("정상 _ga 쿠키 → client_id 추출 후 GA Measurement Protocol 호출", async () => {
    process.env.GA4_API_SECRET = "test_secret";
    const req = makeRequest({ _ga: "GA1.1.1234567890.1700000000" });

    await sendServerGAEvent(req as never, [
      { name: "signup_complete", params: { method: "kakao" } },
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain("https://www.google-analytics.com/mp/collect");
    expect(url).toContain("api_secret=test_secret");
    expect(url).toContain("measurement_id=G-XWRB861513");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body);
    expect(body.client_id).toBe("1234567890.1700000000");
    expect(body.events).toEqual([
      { name: "signup_complete", params: { method: "kakao" } },
    ]);
  });

  it("_ga 쿠키 없음 → 임시 client_id로 발화 (누락보다 별도 카운트가 나음)", async () => {
    process.env.GA4_API_SECRET = "test_secret";
    const req = makeRequest({}); // 쿠키 없음

    await sendServerGAEvent(req as never, [{ name: "signup_complete" }]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.client_id).toMatch(/^srv-\d+-\d+$/);
  });

  it("_ga 쿠키 형식 깨짐 → 임시 client_id로 fallback", async () => {
    process.env.GA4_API_SECRET = "test_secret";
    const req = makeRequest({ _ga: "GA1.1" }); // 파트 부족

    await sendServerGAEvent(req as never, [{ name: "signup_complete" }]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.client_id).toMatch(/^srv-\d+-\d+$/);
  });

  it("fetch 실패해도 throw 안 함 (silent fail로 호출자 흐름 보호)", async () => {
    process.env.GA4_API_SECRET = "test_secret";
    fetchSpy.mockRejectedValueOnce(new Error("network down"));
    const req = makeRequest({ _ga: "GA1.1.1234567890.1700000000" });

    await expect(
      sendServerGAEvent(req as never, [{ name: "signup_complete" }]),
    ).resolves.toBeUndefined();
  });

  it("이벤트 여러 개 한 번에 발화 가능", async () => {
    process.env.GA4_API_SECRET = "test_secret";
    const req = makeRequest({ _ga: "GA1.1.1234567890.1700000000" });

    await sendServerGAEvent(req as never, [
      { name: "signup_complete", params: { method: "kakao" } },
      { name: "first_team_create", params: { team_name: "FCMZ" } },
    ]);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.events).toHaveLength(2);
    expect(body.events[1].name).toBe("first_team_create");
  });
});
