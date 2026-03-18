import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession } from "../helpers/auth";

// Hoist env setup so it runs before module evaluation
const { VAPID_PUBLIC, VAPID_PRIVATE } = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
  process.env.VAPID_PRIVATE_KEY = "test-private-key";
  return {
    VAPID_PUBLIC: "test-public-key",
    VAPID_PRIVATE: "test-private-key",
  };
});

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({}),
  },
}));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import webpush from "web-push";
import { POST } from "@/app/api/push/send/route";

const mockSubscriptions = [
  { endpoint: "https://push.example.com/sub1", p256dh: "p256dh-1", auth: "auth-1", user_id: "user-1" },
  { endpoint: "https://push.example.com/sub2", p256dh: "p256dh-2", auth: "auth-2", user_id: "user-2" },
];

const mockMembers = [{ user_id: "user-1" }, { user_id: "user-2" }];

// ─── POST /api/push/send ──────────────────────────────────────────────────────
describe("POST /api/push/send", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest({ title: "알림", body: "내용" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("403: MEMBER 권한은 접근 불가", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const res = await POST(makeRequest({ title: "알림", body: "내용" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Forbidden");
  });

  it("400: title 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(
      ["team_members", mockMembers],
      ["push_subscriptions", mockSubscriptions]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ body: "내용만 있음" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing title or body");
  });

  it("400: body 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(
      ["team_members", mockMembers],
      ["push_subscriptions", mockSubscriptions]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ title: "제목만 있음" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing title or body");
  });

  it("200: 팀 멤버에게 전송 성공 및 sent 수 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(
      ["team_members", mockMembers],
      ["push_subscriptions", mockSubscriptions]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ title: "공지", body: "경기 일정 안내" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sent).toBe(2);
  });

  it("200: webpush.sendNotification 호출 검증", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(
      ["team_members", mockMembers],
      ["push_subscriptions", mockSubscriptions]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    await POST(makeRequest({ title: "공지", body: "내용", url: "/matches" }));

    expect(vi.mocked(webpush.sendNotification)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(webpush.sendNotification)).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: mockSubscriptions[0].endpoint }),
      expect.stringContaining("공지")
    );
  });

  it("200: 구독자 없는 경우 sent:0 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(
      ["team_members", mockMembers],
      ["push_subscriptions", []]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ title: "공지", body: "내용" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sent).toBe(0);
  });

  it("200: 팀 멤버 없는 경우 sent:0 반환", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const db = createMockDb(["team_members", []]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ title: "공지", body: "내용" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sent).toBe(0);
  });

  it("200: userIds 지정 시 해당 유저에게만 전송", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const singleSub = [mockSubscriptions[0]];
    const db = createMockDb(["push_subscriptions", singleSub]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(
      makeRequest({ title: "개인 알림", body: "내용", userIds: ["user-1"] })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sent).toBe(1);
  });
});
