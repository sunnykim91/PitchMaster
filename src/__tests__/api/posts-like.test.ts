import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/posts/like/route";
import { createMockDb } from "../helpers/db";
import { memberSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/posts/like", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── POST /api/posts/like ──────────────────────────────────────────────────────
describe("POST /api/posts/like", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const res = await POST(makeRequest({ postId: "p1" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);

    const res = await POST(makeRequest({ postId: "p1" }));
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await POST(makeRequest({ postId: "p1" }));
    expect(res.status).toBe(503);
  });

  it("400: postId 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    // DB is irrelevant — route returns 400 before querying
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("200: 이미 좋아요 — 취소 (liked: false)", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    // 1st call: maybeSingle() returns existing like record
    // 2nd call: delete (no meaningful return value needed)
    const db = createMockDb(
      ["post_likes", { id: "like1" }],
      ["post_likes", null],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ postId: "p1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.liked).toBe(false);
  });

  it("201: 아직 좋아요 안 함 — 좋아요 추가 (liked: true)", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    // 1st call: maybeSingle() returns null (no existing like)
    // 2nd call: insert
    const db = createMockDb(
      ["post_likes", null],
      ["post_likes", null],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ postId: "p1" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.liked).toBe(true);
  });

  it("400: 좋아요 insert 실패 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    // 1st call: maybeSingle() returns null (not yet liked)
    // 2nd call: insert with error
    const db = createMockDb(
      ["post_likes", null],
      ["post_likes", null, { message: "insert failed" }],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makeRequest({ postId: "p1" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("insert failed");
  });
});
