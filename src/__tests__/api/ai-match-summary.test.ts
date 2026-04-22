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
describe("POST /api/ai/match-summary/[matchId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401: 비로그인 접근 거부", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest(MATCH_ID), makeParams(MATCH_ID));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("503: team_lookup_failed (teams 조회 에러)", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(["teams", null, { message: "DB error" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const res = await POST(makeRequest(MATCH_ID), makeParams(MATCH_ID));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("team_lookup_failed");
  });

  it("503: team_lookup_failed (team row null)", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(["teams", null]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const res = await POST(makeRequest(MATCH_ID), makeParams(MATCH_ID));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("team_lookup_failed");
  });

  it("403: FUTSAL 팀 차단", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    const db = createMockDb(["teams", { sport_type: "FUTSAL" }]);
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const res = await POST(makeRequest(MATCH_ID), makeParams(MATCH_ID));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("ai_not_available_for_futsal");
  });

  it("503: db_unavailable (두 번째 getSupabaseAdmin null)", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    // 첫 번째 호출(teams 체크): null → db 없으므로 체크 건너뜀
    // 두 번째 호출(matches 조회): null → 503
    vi.mocked(getSupabaseAdmin)
      .mockReturnValueOnce(null)  // teams 체크 — null이면 체크 통과
      .mockReturnValueOnce(null); // matches 조회 — 503
    const res = await POST(makeRequest(MATCH_ID), makeParams(MATCH_ID));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("db_unavailable");
  });

  it("404: match_not_found", async () => {
    vi.mocked(auth).mockResolvedValue(presidentSession);
    // teams 체크 db: null → 건너뜀. matches 조회 db: 유효 db, match row null
    const db = createMockDb(["matches", null]);
    vi.mocked(getSupabaseAdmin)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(db as ReturnType<typeof getSupabaseAdmin>);
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
    vi.mocked(getSupabaseAdmin)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(db as ReturnType<typeof getSupabaseAdmin>);
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
    // teams: null(건너뜀), matches: matchRow, then Promise.all 4개 + team_members(error)
    // createMockDb 큐 순서: matches → match_goals → match_mvp_votes → match_attendance → match_guests → team_members(error)
    const db = createMockDb(
      ["matches", matchRow],
      ["match_goals", []],
      ["match_mvp_votes", []],
      ["match_attendance", []],
      ["match_guests", []],
      ["team_members", null, { message: "DB error" }],
    );
    vi.mocked(getSupabaseAdmin)
      .mockReturnValueOnce(null)
      .mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
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
    vi.mocked(getSupabaseAdmin)
      .mockReturnValueOnce(null)
      .mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const res = await POST(makeRequest(MATCH_ID), makeParams(MATCH_ID));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
  });

  it("200: teamId 없는 세션 — 팀 조회 건너뜀 후 db 조회 직행", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const matchRow = {
      id: MATCH_ID,
      match_type: "EVENT",
      ai_summary_regenerate_count: 0,
      opponent_name: null,
      player_count: 11,
      match_date: "2026-04-22",
    };
    // noTeamSession은 teamId 없어 teams 체크 if 블록 자체를 건너뜀.
    // 첫 번째 getSupabaseAdmin()이 matches 조회에 사용됨.
    const db = createMockDb(
      ["matches", matchRow],
      ["match_goals", []],
      ["match_mvp_votes", []],
      ["match_attendance", [{ user_id: "user-1", member_id: "mem-1", actually_attended: true, attendance_status: "PRESENT" }]],
      ["match_guests", []],
      ["team_members", []],
      ["matches", null],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);
    const res = await POST(makeRequest(MATCH_ID), makeParams(MATCH_ID));
    expect(res.status).toBe(200);
  });
});
