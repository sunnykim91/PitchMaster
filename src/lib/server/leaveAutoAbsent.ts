import type { SupabaseClient } from "@supabase/supabase-js";
import { getKstToday } from "@/lib/kstDate";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 휴회(LEAVE) 회원의 "자동 불참" 처리 로직.
 *
 * 정책 (FC발로만/총무 요청, 2026-07):
 *  - 휴회(LEAVE)를 등록하면 그 기간 경기에서 회원을 자동 '불참'(auto_absent)으로 표시.
 *  - 이미 있는 경기 + 휴회 기간 중 새로 생기는 경기 모두 적용.
 *  - **이미 본인이 투표한 경기는 건드리지 않음** (1-B).
 *  - 본인이 나중에 직접 투표하면 그 vote 로 덮이며 auto_absent=false 로 전환(attendance POST).
 *  - 휴회 해제 시 **아직 안 지난(미래) 경기의 자동 불참만** 회수(과거는 유지).
 *  - 부상(INJURED)은 '숨김'이라 여기서 다루지 않음(명단 필터에서 처리).
 */

const AUTO_ABSENT_ROW = (matchId: string, memberId: string, userId: string | null, nowIso: string) => ({
  match_id: matchId,
  member_id: memberId,
  user_id: userId,
  vote: "ABSENT" as const,
  auto_absent: true,
  voted_at: nowIso,
});

/** 휴회 기간 [start, end]이 경기일(matchDate, KST 'YYYY-MM-DD')을 포함하는지 (end null = 무기한). */
export function leaveCoversDate(startDate: string, endDate: string | null, matchDate: string): boolean {
  if (matchDate < startDate) return false;
  if (endDate && matchDate > endDate) return false;
  return true;
}

/**
 * 한 경기(matchId, matchDate)에 대해, 그 날짜를 포함하는 활성 휴회 회원 전원을
 * 자동 불참 처리. (경기 생성 시 호출) 이미 이 경기에 행이 있는 회원은 제외.
 */
export async function applyLeaveAbsenceForMatch(
  db: SupabaseClient, teamId: string, matchId: string, matchDate: string,
): Promise<void> {
  const { data: exemptions } = await db
    .from("member_dues_exemptions")
    .select("member_id, start_date, end_date")
    .eq("team_id", teamId)
    .eq("exemption_type", "LEAVE")
    .neq("is_active", false);
  const covering = (exemptions ?? []).filter((e: any) => leaveCoversDate(e.start_date, e.end_date, matchDate));
  if (covering.length === 0) return;

  const memberIds: string[] = covering.map((e: any) => e.member_id);
  const { data: tms } = await db.from("team_members").select("id, user_id").in("id", memberIds);
  const userByMember = new Map<string, string | null>((tms ?? []).map((t: any) => [t.id, t.user_id]));

  const { data: existing } = await db
    .from("match_attendance").select("member_id, user_id").eq("match_id", matchId);
  const votedMembers = new Set((existing ?? []).map((r: any) => r.member_id).filter(Boolean));
  const votedUsers = new Set((existing ?? []).map((r: any) => r.user_id).filter(Boolean));

  const nowIso = new Date().toISOString();
  const rows = memberIds
    .filter((mid) => {
      const uid = userByMember.get(mid);
      return !votedMembers.has(mid) && !(uid && votedUsers.has(uid));
    })
    .map((mid) => AUTO_ABSENT_ROW(matchId, mid, userByMember.get(mid) ?? null, nowIso));
  if (rows.length > 0) await db.from("match_attendance").insert(rows);
}

/**
 * 한 회원의 휴회 기간 [start, end] 내 모든 경기에 자동 불참 backfill. (휴회 등록 시 호출)
 * 이미 그 회원이 투표한(행이 있는) 경기는 제외.
 */
export async function applyLeaveAbsenceForMember(
  db: SupabaseClient, teamId: string, memberId: string, startDate: string, endDate: string | null,
): Promise<void> {
  let q = db.from("matches").select("id, match_date").eq("team_id", teamId).gte("match_date", startDate);
  if (endDate) q = q.lte("match_date", endDate);
  const { data: matches } = await q;
  if (!matches || matches.length === 0) return;

  const { data: tm } = await db.from("team_members").select("user_id").eq("id", memberId).single();
  const userId = (tm?.user_id as string | null) ?? null;

  const matchIds: string[] = (matches as any[]).map((m) => m.id);
  const { data: existing } = await db
    .from("match_attendance").select("match_id").in("match_id", matchIds)
    .or(`member_id.eq.${memberId}${userId ? `,user_id.eq.${userId}` : ""}`);
  const votedMatchIds = new Set((existing ?? []).map((r: any) => r.match_id));

  const nowIso = new Date().toISOString();
  const rows = (matches as any[])
    .filter((m) => !votedMatchIds.has(m.id))
    .map((m) => AUTO_ABSENT_ROW(m.id, memberId, userId, nowIso));
  if (rows.length > 0) await db.from("match_attendance").insert(rows);
}

/**
 * 휴회 해제 시: 아직 안 지난(오늘 이후) 경기의 '자동' 불참만 회수.
 * 과거 경기 + 본인이 직접 찍은 표(auto_absent=false)는 유지.
 */
export async function clearFutureAutoAbsence(
  db: SupabaseClient, teamId: string, memberId: string,
): Promise<void> {
  const today = getKstToday();
  const { data: futureMatches } = await db
    .from("matches").select("id").eq("team_id", teamId).gte("match_date", today);
  const ids: string[] = (futureMatches ?? []).map((m: any) => m.id);
  if (ids.length === 0) return;
  await db
    .from("match_attendance").delete()
    .eq("member_id", memberId).eq("auto_absent", true).in("match_id", ids);
}
