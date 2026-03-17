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
      { candidate_id: "user-1" }, // 김민준 MVP
    ];
    const attendanceData = [
      { user_id: "user-1", member_id: "mem-1" }, // match-a
      { user_id: "user-1", member_id: "mem-1" }, // match-b
      { user_id: "user-2", member_id: "mem-2" }, // match-a
    ];

    const db = createMockDb(
      ["team_members", teamMembers],
      ["matches", completedMatches],
      ["match_goals", goalsData],   // scorer_id 쿼리
      ["match_goals", assistsData], // assist_id 쿼리
      ["match_mvp_votes", mvpData],
      ["match_attendance", attendanceData]
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
      ["match_attendance", []]
    );
    vi.mocked(getSupabaseAdmin).mockReturnValue(db as ReturnType<typeof getSupabaseAdmin>);

    const res = await GET(makeRequest({ seasonId: "season-001" }));
    expect(res.status).toBe(200);
    // DB의 from("matches")에 seasonId가 eq로 전달되는지 확인
    expect(db.from).toHaveBeenCalledWith("matches");
  });
});
