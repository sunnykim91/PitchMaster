import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/posts/route";
import { createMockDb } from "../helpers/db";
import { memberSession, staffSession, presidentSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const mockPosts = [
  {
    id: "p1",
    title: "첫 번째 게시글",
    content: "내용1",
    category: "FREE",
    post_likes: [{ count: 5 }],
    post_comments: [{ count: 2 }],
  },
  {
    id: "p2",
    title: "두 번째 게시글",
    content: "내용2",
    category: "NOTICE",
    post_likes: [{ count: 0 }],
    post_comments: [{ count: 7 }],
  },
];

function makeGetRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/posts");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url.toString());
}

function makePostRequest(body: object) {
  return new NextRequest("http://localhost/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── GET /api/posts ────────────────────────────────────────────────────────────
describe("GET /api/posts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(503);
  });

  it("200: 게시글 목록 반환 — likes_count, comments_count 평탄화", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["posts", mockPosts]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.posts).toHaveLength(2);
    expect(json.posts[0].likes_count).toBe(5);
    expect(json.posts[0].comments_count).toBe(2);
    expect(json.posts[1].likes_count).toBe(0);
    expect(json.posts[1].comments_count).toBe(7);
  });

  it("200: likes_count/comments_count — 집계 없을 때 기본값 0", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const postsNoAgg = [{ id: "p3", title: "집계 없음", post_likes: [], post_comments: [] }];
    const db = createMockDb(["posts", postsNoAgg]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.posts[0].likes_count).toBe(0);
    expect(json.posts[0].comments_count).toBe(0);
  });

  it("200: category 파라미터로 필터링", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const filtered = [mockPosts[1]];
    const db = createMockDb(["posts", filtered]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeGetRequest({ category: "NOTICE" }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.posts).toHaveLength(1);
    expect(json.posts[0].id).toBe("p2");
  });

  it("400: DB 에러 발생시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["posts", null, { message: "DB connection failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("DB connection failed");
  });
});

// ─── POST /api/posts ───────────────────────────────────────────────────────────
describe("POST /api/posts", () => {
  beforeEach(() => vi.clearAllMocks());

  const postBody = {
    title: "새 게시글",
    content: "게시글 내용입니다.",
    category: "FREE",
    imageUrls: [],
  };

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const res = await POST(makePostRequest(postBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);

    const res = await POST(makePostRequest(postBody));
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);

    const res = await POST(makePostRequest(postBody));
    expect(res.status).toBe(503);
  });

  it("201: MEMBER — 게시글 생성 성공", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const newPost = { id: "p-new", title: "새 게시글", content: "게시글 내용입니다.", category: "FREE" };
    const db = createMockDb(["posts", newPost]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makePostRequest(postBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("p-new");
  });

  it("201: STAFF — 게시글 생성 성공", async () => {
    vi.mocked(auth).mockResolvedValue(staffSession);
    const newPost = { id: "p-staff", title: "공지사항", content: "중요 공지", category: "NOTICE" };
    const db = createMockDb(["posts", newPost]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makePostRequest({ ...postBody, category: "NOTICE", title: "공지사항", content: "중요 공지" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("p-staff");
  });

  it("201: PRESIDENT — 게시글 생성 성공", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const newPost = { id: "p-president", title: "회장 공지", content: "회장 공지 내용", category: "FREE" };
    const db = createMockDb(["posts", newPost]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makePostRequest(postBody));
    expect(res.status).toBe(201);
  });

  it("400: DB 에러 시 에러 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(["posts", null, { message: "insert failed" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await POST(makePostRequest(postBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("insert failed");
  });
});
