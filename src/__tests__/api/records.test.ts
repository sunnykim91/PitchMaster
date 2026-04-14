import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/records/route";
import { createMockDb } from "../helpers/db";
import { memberSession, noTeamSession } from "../helpers/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const teamMembers = [
  {
    id: "mem-1",
    user_id: "user-1",
    pre_name: null,
    users: { id: "user-1", name: "김민준", preferred_positions: ["ST"] },
  },
  {
    id: "mem-2",
    user_id: "user-2",
    pre_name: null,
    users: { id: "user-2", name: "이준혁", preferred_positions: ["GK"] },
  },
  {
    id: "mem-3",
    user_id: null,
    pre_name: "박도훈",
    users: null,
  },
];

const completedMatches = [{ id: "match-a" }, { id: "match-b" }];

// ─── GET /api/records ─────────────────────────────────────────────────────────
describe("GET /api/records", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(params?: Record<string, string>) {
    const url = new URL("http://localhost/api/records");
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    return new NextRequest(url);
  }

  it("401: 로그인하지 않은 경우", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("403: 팀이 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(noTeamSession);
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("503: DB 없는 경우", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(503);
  });

  it("200: 경기 없는 경우 모든 멤버 0점 반환", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["team_members", teamMembers],
      ["matches", []] // 완료된 경기 없음
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.records).toHaveLength(3);
    for (const record of json.records) {
      expect(record.goals).toBe(0);
      expect(record.assists).toBe(0);
      expect(record.mvp).toBe(0);
      expect(record.attendanceRate).toBe(0);
    }
  });

  it("200: 골/어시스트 집계 정확성 — bulk 쿼리 로직", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    const goalsData = [
      { scorer_id: "user-1" }, // 김민준 1골
      { scorer_id: "user-1" }, // 김민준 2골
      { scorer_id: "mem-3" },  // 박도훈 (미연동) 1골
    ];
    const assistsData = [
      { assist_id: "user-2" }, // 이준혁 1어시
    ];
    const mvpData = [
      { match_id: "match-a", candidate_id: "user-1" }, // 김민준 MVP (match-a)
    ];
    const attendanceData = [
      { user_id: "user-1", member_id: "mem-1" }, // match-a
      { user_id: "user-1", member_id: "mem-1" }, // match-b
      { user_id: "user-2", member_id: "mem-2" }, // match-a
    ];
    // 실제 참석(PRESENT/LATE): match-a 1명 → mvp 1표/1명 = 100% (≥70% 임계값 통과)
    const actualAttendData = [
      { match_id: "match-a" },
    ];

    const db = createMockDb(
      ["team_members", teamMembers],
      ["matches", completedMatches],
      ["match_goals", goalsData],   // scorer_id 쿼리
      ["match_goals", assistsData], // assist_id 쿼리
      ["match_mvp_votes", mvpData],
      ["match_attendance", attendanceData],   // vote=ATTEND 쿼리
      ["match_attendance", actualAttendData], // attendance_status=PRESENT/LATE 쿼리
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    const { records } = json;

    // 김민준 검증
    const minJun = records.find((r: { name: string }) => r.name === "김민준");
    expect(minJun).toBeDefined();
    expect(minJun.goals).toBe(2);
    expect(minJun.assists).toBe(0);
    expect(minJun.mvp).toBe(1);
    expect(minJun.attendanceRate).toBe(1); // 2/2

    // 이준혁 검증
    const junHyuk = records.find((r: { name: string }) => r.name === "이준혁");
    expect(junHyuk).toBeDefined();
    expect(junHyuk.goals).toBe(0);
    expect(junHyuk.assists).toBe(1);
    expect(junHyuk.attendanceRate).toBe(0.5); // 1/2

    // 박도훈 (미연동 멤버) 검증
    const doHun = records.find((r: { name: string }) => r.name === "박도훈");
    expect(doHun).toBeDefined();
    expect(doHun.goals).toBe(1);
    expect(doHun.attendanceRate).toBe(0);
  });

  it("200: seasonId 파라미터로 특정 시즌 필터", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    const db = createMockDb(
      ["team_members", teamMembers],
      ["matches", [{ id: "match-season-1" }]],
      ["match_goals", []],
      ["match_goals", []],
      ["match_mvp_votes", []],
      ["match_attendance", []],
      ["match_attendance", []]  // actual attendance (PRESENT/LATE)
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest({ seasonId: "season-001" }));
    expect(res.status).toBe(200);
    // DB의 from("matches")에 seasonId가 eq로 전달되는지 확인
    expect(db.from).toHaveBeenCalledWith("matches");
  });

  it("200: startDate+endDate 파라미터로 날짜 범위 필터 (시즌 조회 없이)", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    // startDate+endDate 사용 시 seasons 테이블 조회 없음 — team_members + matches + 4 bulk 쿼리
    const db = createMockDb(
      ["team_members", teamMembers],
      ["matches", [{ id: "match-date-1" }]],
      ["match_goals", []],
      ["match_goals", []],
      ["match_mvp_votes", []],
      ["match_attendance", []],
      ["match_attendance", []]  // actual attendance (PRESENT/LATE)
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest({ startDate: "2026-01-01", endDate: "2026-03-31" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.records).toHaveLength(3);
    // seasons 테이블 호출이 없어야 함 (from 호출 목록에 "seasons" 없음)
    const fromCalls = db.from.mock.calls.map((c: [string]) => c[0]);
    expect(fromCalls).not.toContain("seasons");
  });

  it("200: seasonId와 startDate 동시 제공 시 startDate 우선", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);
    // startDate가 우선이므로 seasons 조회 없이 직접 날짜 필터
    const db = createMockDb(
      ["team_members", teamMembers],
      ["matches", [{ id: "match-priority-1" }]],
      ["match_goals", []],
      ["match_goals", []],
      ["match_mvp_votes", []],
      ["match_attendance", []],
      ["match_attendance", []]  // actual attendance (PRESENT/LATE)
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest({ seasonId: "season-001", startDate: "2026-01-01", endDate: "2026-06-30" }));
    expect(res.status).toBe(200);
    // seasons 테이블 조회가 발생하지 않아야 함
    const fromCalls = db.from.mock.calls.map((c: [string]) => c[0]);
    expect(fromCalls).not.toContain("seasons");
  });

  it("출석률: user_id/member_id 혼재 시 Math.max로 큰 값 사용", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    // 5경기 중 member_id로 3번, user_id로 1번 출석 기록
    // → attendByUserId = 1, attendByMemberId = 3
    // → Math.max(1, 3) = 3, 출석률 = 3/5 = 0.6
    const fiveMatches = [
      { id: "m-1" }, { id: "m-2" }, { id: "m-3" }, { id: "m-4" }, { id: "m-5" },
    ];
    const attendanceData = [
      { user_id: null, member_id: "mem-1" },      // 스태프 체크
      { user_id: null, member_id: "mem-1" },      // 스태프 체크
      { user_id: "user-1", member_id: "mem-1" },  // 본인 투표
    ];

    const db = createMockDb(
      ["team_members", teamMembers],
      ["matches", fiveMatches],
      ["match_goals", []],
      ["match_goals", []],
      ["match_mvp_votes", []],
      ["match_attendance", attendanceData],
      ["match_attendance", []]  // actual attendance (PRESENT/LATE)
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest());
    const json = await res.json();
    const minJun = json.records.find((r: { name: string }) => r.name === "김민준");
    // user_id 카운트(1)가 아닌 member_id 카운트(3)를 사용해야 함
    expect(minJun.attendanceRate).toBe(0.6); // 3/5
  });

  it("전체 통합: 분모 = 레거시 games + 실제 경기수", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    const db = createMockDb(
      // mode="all" → team_members 조회
      ["team_members", [
        { id: "mem-1", user_id: "user-1", pre_name: null, users: { id: "user-1", name: "테스트", preferred_positions: [] } },
      ]],
      // legacy_player_stats
      ["legacy_player_stats", [
        { member_name: "테스트", goals: 5, assists: 3, attendance: 18, games: 20 },
      ]],
      // matches (실제 완료 경기 10개)
      ["matches", Array.from({ length: 10 }, (_, i) => ({ id: `rm-${i}` }))],
      // match_goals (득점)
      ["match_goals", []],
      // match_goals (도움)
      ["match_goals", []],
      // match_attendance (실제 5경기 참석)
      ["match_attendance", Array.from({ length: 5 }, () => ({ user_id: "user-1", member_id: "mem-1" }))],
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest({ mode: "all" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    const record = json.records.find((r: { name: string }) => r.name === "테스트");
    // 분자: 레거시 18 + 실제 5 = 23
    // 분모: 레거시 games 20 + 실제 경기 10 = 30
    // 출석률: 23/30 ≈ 0.7667
    expect(record.attendanceRate).toBeCloseTo(23 / 30, 4);
    expect(record.attendanceRate).toBeLessThanOrEqual(1);
  });

  it("전체 통합: 레거시만 있고 실제 경기 없으면 레거시 비율 사용", async () => {
    vi.mocked(auth).mockResolvedValue(memberSession);

    const db = createMockDb(
      ["team_members", [
        { id: "mem-1", user_id: null, pre_name: "레거시맨", users: null },
      ]],
      ["legacy_player_stats", [
        { member_name: "레거시맨", goals: 10, assists: 2, attendance: 15, games: 20 },
      ]],
      ["matches", []], // 실제 경기 없음
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest({ mode: "all" }));
    const json = await res.json();
    const record = json.records.find((r: { name: string }) => r.name === "레거시맨");
    // 분모 = games(20) + totalGames(0) = 20
    expect(record.attendanceRate).toBe(15 / 20);
  });
});
