import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/comments/route";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const mockComments = [
  { id: "c1", post_id: "p1", content: "첫 댓글", author: { name: "일반 멤버" } },
  { id: "c2", post_id: "p1", content: "두 번째 댓글", author: { name: "운영진" } },
];

function makeGetRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/comments");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url.toString());
}

function makePostRequest(body: object) {
  return new NextRequest("http://localhost/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── GET /api/comments ────────────────────────────────────────────────────────
describe("GET /api/comments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const res = await GET(makeGetRequest({ postId: "p1" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);

    const res = await GET(makeGetRequest({ postId: "p1" }));
    expect(res.status).toBe(403);
  });

  it("400: postId 파라미터 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await GET(makeGetRequest({ postId: "p1" }));
    expect(res.status).toBe(503);
  });

  it("200: 댓글 목록 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["post_comments", mockComments]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeGetRequest({ postId: "p1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.comments).toEqual(mockComments);
    expect(json.comments).toHaveLength(2);
  });

  it("200: 댓글 없으면 빈 배열 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["post_comments", []]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeGetRequest({ postId: "p-no-comments" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.comments).toEqual([]);
  });

  it("400: DB 에러 발생시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["post_comments", null, { message: "query failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeGetRequest({ postId: "p1" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("query failed");
  });
});

// ─── POST /api/comments ───────────────────────────────────────────────────────
describe("POST /api/comments", () => {
  beforeEach(() => vi.clearAllMocks());

  const commentBody = {
    postId: "p1",
    content: "새 댓글 내용",
  };

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const res = await POST(makePostRequest(commentBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);

    const res = await POST(makePostRequest(commentBody));
    expect(res.status).toBe(403);
  });

  it("400: postId 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makePostRequest({ content: "내용만 있음" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("400: content 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb();
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makePostRequest({ postId: "p1" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await POST(makePostRequest(commentBody));
    expect(res.status).toBe(503);
  });

  it("201: MEMBER — 댓글 작성 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const newComment = { id: "c-new", post_id: "p1", content: "새 댓글 내용", author: { name: "일반 멤버" } };
    const db = createMockDb(["post_comments", newComment]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makePostRequest(commentBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("c-new");
    expect(json.content).toBe("새 댓글 내용");
  });

  it("201: STAFF — 댓글 작성 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const newComment = { id: "c-staff", post_id: "p1", content: "운영진 댓글", author: { name: "운영진" } };
    const db = createMockDb(["post_comments", newComment]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makePostRequest({ postId: "p1", content: "운영진 댓글" }));
    expect(res.status).toBe(201);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["post_comments", null, { message: "insert failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makePostRequest(commentBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("insert failed");
  });
});
