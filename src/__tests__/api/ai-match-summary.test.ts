import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockDb } from "../helpers/db";
import { presidentSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/matchSummaryTemplate", () => ({
  generateMatchSummaryFromTemplate: vi.fn(() => "테스트 경기 후기 텍스트"),
}));
vi.mock("@/lib/server/aiMatchSummary", () => ({
  // MatchSummaryInput 타입만 사용
}));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { POST } from "@/app/api/ai/match-summary/[matchId]/route";

const MATCH_ID = "match-001";

function makeRequest(matchId: string, body?: object) {
  return new NextRequest(`http://localhost/api/ai/match-summary/${matchId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeParams(matchId: string) {
  return { params: Promise.resolve({ matchId }) };
}

// ─── POST /api/ai/match-summary/[matchId] ─────────────────────────────────────
// 71차: 풋살 팀 차단 코드 삭제 — 자동 생성은 풋살도 받는 마당에 재생성만 403은 무의미.
// 따라서 teams 조회/풋살 분기 관련 테스트 케이스 3건 제거 후 mockReturnValue 흐름 단순화.
describe("POST /api/ai/match-summary/[matchId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest(MATCH_ID), makeParams(MATCH_ID));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("503: db_unavailable (getSupabaseAdmin null)", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await POST(makeRequest(MATCH_ID), makeParams(MATCH_ID));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("db_unavailable");
  });

  it("404: match_not_found", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(["matches", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as unknown as ReturnType<typeof getSupabaseAdmin>);
    const res = await POST(makeRequest(MATCH_ID), makeParams(MATCH_ID));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("match_not_found");
  });

  it("429: regenerate_limit (재생성 1회 이미 사용)", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const matchRow = {
      id: MATCH_ID,
      match_type: "REGULAR",
      ai_summary_regenerate_count: 1,
      opponent_name: "상대팀",
      player_count: 11,
      match_date: "2026-04-22",
    };
    const db = createMockDb(["matches", matchRow]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as unknown as ReturnType<typeof getSupabaseAdmin>);
    const res = await POST(makeRequest(MATCH_ID, { regenerate: true }), makeParams(MATCH_ID));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe("regenerate_limit");
  });

  it("503: members_lookup_failed", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const matchRow = {
      id: MATCH_ID,
      match_type: "REGULAR",
      ai_summary_regenerate_count: 0,
      opponent_name: "상대팀",
      player_count: 11,
      match_date: "2026-04-22",
    };
    const db = createMockDb(
      ["matches", matchRow],
      ["match_goals", []],
      ["match_mvp_votes", []],
      ["match_attendance", []],
      ["match_guests", []],
      ["team_members", null, { message: "DB error" }],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as unknown as ReturnType<typeof getSupabaseAdmin>);
    const res = await POST(makeRequest(MATCH_ID), makeParams(MATCH_ID));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("members_lookup_failed");
  });

  it("200: 성공 — text/event-stream 반환", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const matchRow = {
      id: MATCH_ID,
      match_type: "REGULAR",
      ai_summary_regenerate_count: 0,
      opponent_name: "상대팀",
      player_count: 11,
      match_date: "2026-04-22",
    };
    const db = createMockDb(
      ["matches", matchRow],
      ["match_goals", [{ scorer_id: "mem-1", assist_id: null, quarter_number: 1, is_own_goal: false }]],
      ["match_mvp_votes", []],
      ["match_attendance", [{ user_id: "user-1", member_id: "mem-1", actually_attended: true, attendance_status: "PRESENT" }]],
      ["match_guests", []],
      ["team_members", [{ id: "mem-1", user_id: "user-1", pre_name: null, users: { name: "홍길동" } }]],
      ["matches", null], // update
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as unknown as ReturnType<typeof getSupabaseAdmin>);
    const res = await POST(makeRequest(MATCH_ID), makeParams(MATCH_ID));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
  });

  it("200: teamId 없는 세션도 정상 처리", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const matchRow = {
      id: MATCH_ID,
      match_type: "EVENT",
      ai_summary_regenerate_count: 0,
      opponent_name: null,
      player_count: 11,
      match_date: "2026-04-22",
    };
    const db = createMockDb(
      ["matches", matchRow],
      ["match_goals", []],
      ["match_mvp_votes", []],
      ["match_attendance", [{ user_id: "user-1", member_id: "mem-1", actually_attended: true, attendance_status: "PRESENT" }]],
      ["match_guests", []],
      ["team_members", []],
      ["matches", null],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as unknown as ReturnType<typeof getSupabaseAdmin>);
    const res = await POST(makeRequest(MATCH_ID), makeParams(MATCH_ID));
    expect(res.status).toBe(200);
  });
});
