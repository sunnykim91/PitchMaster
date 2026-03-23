import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, DELETE } from "@/app/api/push/subscribe/route";
import { createMockDb } from "../helpers/db";
import { memberSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// ─── POST /api/push/subscribe ────────────────────────────────────────────────
describe("POST /api/push/subscribe", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest({ endpoint: "https://push.example.com/sub" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("500: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await POST(makeRequest({ endpoint: "https://push.example.com/sub" }));
    expect(res.status).toBe(500);
  });

  it("400: endpoint 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["push_subscriptions", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid subscription");
  });

  it("200: 구독 등록 성공 (delete+insert)", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["push_subscriptions", null],  // delete
      ["push_subscriptions", null]   // insert
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(
      makeRequest({
        endpoint: "https://push.example.com/sub",
        keys: { p256dh: "key-p256dh", auth: "key-auth" },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("500: DB insert 에러 시 500 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    // delete 성공 후 insert 실패
    const db = createMockDb(
      ["push_subscriptions", null],  // delete
      ["push_subscriptions", null, { message: "insert failed" }]  // insert
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(
      makeRequest({ endpoint: "https://push.example.com/sub" })
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("insert failed");
  });
});

// ─── DELETE /api/push/subscribe ──────────────────────────────────────────────
describe("DELETE /api/push/subscribe", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: object) {
    return new NextRequest("http://localhost/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DELETE(makeRequest({ endpoint: "https://push.example.com/sub" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("500: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await DELETE(makeRequest({ endpoint: "https://push.example.com/sub" }));
    expect(res.status).toBe(500);
  });

  it("400: endpoint 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["push_subscriptions", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await DELETE(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing endpoint");
  });

  it("200: 구독 삭제 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["push_subscriptions", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await DELETE(makeRequest({ endpoint: "https://push.example.com/sub" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
