import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { isStaffOrAbove } from "@/lib/permissions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isValidUuid } from "@/lib/validators/uuid";

/**
 * GET /api/attendance/recent?matchId=X
 *
 * 감독·주장(STAFF+) 전용 — 스쿼드 짤 때 참석자별 "최근 출석"을 한눈에 보기 위한 참고 데이터.
 * 이 경기 직전 완료 경기 최대 4개에서 각 활성 회원의 실제 출석(PRESENT/LATE)을 집계한다.
 *
 * 반환: { members: [{ userId, memberId, attended, eligible, isNew }], window }
 *   - eligible = 윈도우 경기 중 합류일(joined_at) 이후 경기 수
 *   - isNew = eligible < window (합류 중간이라 표본 부족 → "신규"로 분리 표시)
 *
 * ⚠️ 친목 보호: 운영진만 접근(일반 회원에게 출석 줄세우기 노출 금지).
 */
const WINDOW = 4;

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;
  if (!isStaffOrAbove(ctx.teamRole)) return apiError("권한이 없습니다", 403);

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId || !isValidUuid(matchId)) return apiError("invalid matchId");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 이 경기 (팀 검증 + 기준 날짜)
  const { data: match } = await db
    .from("matches")
    .select("match_date, team_id")
    .eq("id", matchId)
    .single();
  if (!match || match.team_id !== ctx.teamId) return apiError("Match not found", 404);

  // 직전 완료 경기 최대 WINDOW개 (EVENT 제외)
  const { data: recentMatches } = await db
    .from("matches")
    .select("id, match_date")
    .eq("team_id", ctx.teamId)
    .eq("status", "COMPLETED")
    .neq("match_type", "EVENT")
    .lt("match_date", match.match_date as string)
    .order("match_date", { ascending: false })
    .limit(WINDOW);

  const matches = recentMatches ?? [];
  const win = matches.length;
  if (win === 0) return apiSuccess({ members: [], window: 0 });

  const matchIds = matches.map((m) => m.id);
  const matchDates = matches.map((m) => m.match_date as string);

  const { data: attRows } = await db
    .from("match_attendance")
    .select("match_id, user_id, member_id, attendance_status")
    .in("match_id", matchIds);

  const { data: members } = await db
    .from("team_members")
    .select("id, user_id, joined_at")
    .eq("team_id", ctx.teamId)
    .eq("status", "ACTIVE");

  // user_id → member_id 브릿지 (출석행이 user_id로만 있는 경우 매칭)
  const userToMember = new Map<string, string>();
  for (const m of members ?? []) {
    if (m.user_id) userToMember.set(m.user_id, m.id);
  }
  const canon = (memberId?: string | null, userId?: string | null): string | null => {
    if (memberId) return memberId;
    if (userId) return userToMember.get(userId) ?? null;
    return null;
  };

  // 경기×회원 출석 상태 맵 (member_id 기준)
  const statusMap = new Map<string, string>(); // `${matchId}|${memberId}` -> attendance_status
  for (const a of attRows ?? []) {
    const k = canon(a.member_id as string | null, a.user_id as string | null);
    if (k) statusMap.set(`${a.match_id}|${k}`, (a.attendance_status as string | null) ?? "");
  }

  // matches 는 최신→과거 순 → statuses 도 같은 순서(왼쪽=최신)로 반환.
  const result = (members ?? []).map((m) => {
    let joinKst: string | null = null;
    if (m.joined_at) {
      joinKst = new Date(new Date(m.joined_at).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }
    let attended = 0;
    let eligible = 0;
    const statuses = matches.map((mm) => {
      const md = mm.match_date as string;
      if (joinKst && md < joinKst) return "pre"; // 합류 전 — 표본 아님
      eligible++;
      const st = statusMap.get(`${mm.id}|${m.id}`);
      if (st === "PRESENT") { attended++; return "present"; }
      if (st === "LATE") { attended++; return "late"; }
      return "absent";
    });
    return {
      userId: (m.user_id as string | null) ?? null,
      memberId: m.id as string,
      attended,
      eligible,
      isNew: eligible < win,
      statuses,
    };
  });

  return apiSuccess({ members: result, window: win });
}
