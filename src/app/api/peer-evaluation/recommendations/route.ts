import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SportType } from "@/lib/playerAttributes/types";

const VALID_SPORTS: SportType[] = ["SOCCER", "FUTSAL"];
const ATTENDED_STATUSES = ["PRESENT", "LATE"];

interface Recommendation {
  user_id: string;
  name: string;
  profile_image_url: string | null;
  preferred_positions: string[];
  sample_count: number;
  /** evaluator 와 같이 출석한 경기 수 (친숙도 지표) */
  co_attendance: number;
}

/**
 * Phase 2C 동료 평가 추천 (B3 출석 빈도 기반).
 *
 * 정렬:
 *   1차) co_attendance DESC — 같이 뛰어본 횟수 많은 순 (잘 아는 사람 우선)
 *   2차) sample_count ASC  — 평가 적게 받은 사람 우선 (분포 균형)
 *   3차) random            — 동률 셔플
 *
 * fallback: evaluator 가 아직 출석 기록 없으면 sample_count + random 만 적용.
 */
export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  // 45차 후속 "감독 노트" 정책: 평가 추천도 운영진만.
  if (ctx.teamRole !== "PRESIDENT" && ctx.teamRole !== "STAFF") {
    return apiError("평가는 운영진만 가능합니다", 403);
  }

  const teamIdParam = request.nextUrl.searchParams.get("team_id");
  const teamId = teamIdParam ?? ctx.teamId;
  if (!teamId) return apiError("팀 정보가 없습니다", 400);

  const excludeParam = request.nextUrl.searchParams.get("exclude") ?? "";
  const excludeIds = excludeParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const sb = getSupabaseAdmin();
  if (!sb) return apiError("DB unavailable", 503);

  // evaluator team_member_id + ACTIVE 검증 한 방에
  const { data: evaluatorMember, error: memErr } = await sb
    .from("team_members")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("team_id", teamId)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (memErr) return apiError(memErr.message, 500);
  if (!evaluatorMember) return apiError("해당 팀의 활성 멤버가 아닙니다", 403);
  const evaluatorMemberId = evaluatorMember.id as string;

  // 팀 sport_type
  const { data: team, error: teamErr } = await sb
    .from("teams")
    .select("sport_type")
    .eq("id", teamId)
    .maybeSingle();
  if (teamErr) return apiError(teamErr.message, 500);
  const sportType = team?.sport_type as SportType | undefined;
  if (!sportType || !VALID_SPORTS.includes(sportType)) {
    return apiError("팀 sport_type 미설정", 400);
  }

  // 같은 팀 ACTIVE 멤버 (자기 제외, user_id 보유 — 사전등록 자동 제외)
  const { data: members, error: membersErr } = await sb
    .from("team_members")
    .select(
      `
        id,
        user_id,
        users:user_id (
          id,
          name,
          profile_image_url,
          preferred_positions
        )
      `,
    )
    .eq("team_id", teamId)
    .eq("status", "ACTIVE")
    .not("user_id", "is", null)
    .neq("user_id", ctx.userId);
  if (membersErr) return apiError(membersErr.message, 500);

  type UserRel = {
    id: string;
    name: string | null;
    profile_image_url: string | null;
    preferred_positions: string[] | null;
  };
  type MemberRow = {
    id: string;
    user_id: string | null;
    users: UserRel | UserRel[] | null;
  };

  const normalizeUser = (u: UserRel | UserRel[] | null): UserRel | null => {
    if (!u) return null;
    return Array.isArray(u) ? (u[0] ?? null) : u;
  };

  // member_id ↔ user_id 매핑 (출석 카운트는 member_id 기준 → user_id 환원)
  const memberIdToUserId = new Map<string, string>();
  const candidates = ((members ?? []) as unknown as MemberRow[])
    .filter((m): m is MemberRow & { user_id: string } => Boolean(m.user_id))
    .filter((m) => !excludeIds.includes(m.user_id))
    .map((m) => {
      memberIdToUserId.set(m.id, m.user_id);
      const u = normalizeUser(m.users);
      return {
        member_id: m.id,
        user_id: m.user_id,
        name: u?.name ?? "이름 없음",
        profile_image_url: u?.profile_image_url ?? null,
        preferred_positions: u?.preferred_positions ?? [],
      };
    });

  if (candidates.length === 0) {
    return apiSuccess({ recommendations: [], sport_type: sportType, pool_size: 0 });
  }

  // evaluator 가 출석한 match_ids
  const { data: myAttendance, error: attErr } = await sb
    .from("match_attendance")
    .select("match_id")
    .eq("member_id", evaluatorMemberId)
    .in("attendance_status", ATTENDED_STATUSES);
  if (attErr) return apiError(attErr.message, 500);
  const myMatchIds = [
    ...new Set(((myAttendance ?? []) as { match_id: string }[]).map((r) => r.match_id)),
  ];

  // 후보별 같이 출석한 경기 수 (member_id 기준)
  const coAttendance = new Map<string, number>();
  if (myMatchIds.length > 0) {
    const candidateMemberIds = candidates.map((c) => c.member_id);
    const { data: othersAttendance, error: othersErr } = await sb
      .from("match_attendance")
      .select("member_id")
      .in("match_id", myMatchIds)
      .in("attendance_status", ATTENDED_STATUSES)
      .in("member_id", candidateMemberIds);
    if (othersErr) return apiError(othersErr.message, 500);
    for (const row of (othersAttendance ?? []) as { member_id: string }[]) {
      coAttendance.set(row.member_id, (coAttendance.get(row.member_id) ?? 0) + 1);
    }
  }

  // 평가 누적 수 (sample_count, sport_type 별)
  const candidateUserIds = candidates.map((c) => c.user_id);
  const { data: evalRows, error: evalErr } = await sb
    .from("player_evaluations")
    .select("target_user_id")
    .in("target_user_id", candidateUserIds)
    .eq("sport_type", sportType);
  if (evalErr) return apiError(evalErr.message, 500);
  const sampleCounts = new Map<string, number>();
  for (const r of (evalRows ?? []) as { target_user_id: string }[]) {
    sampleCounts.set(r.target_user_id, (sampleCounts.get(r.target_user_id) ?? 0) + 1);
  }

  const enriched: Recommendation[] = candidates.map((c) => ({
    user_id: c.user_id,
    name: c.name,
    profile_image_url: c.profile_image_url,
    preferred_positions: c.preferred_positions,
    sample_count: sampleCounts.get(c.user_id) ?? 0,
    co_attendance: coAttendance.get(c.member_id) ?? 0,
  }));

  // 정렬: co_attendance DESC > sample_count ASC > random
  const ranked = enriched
    .map((r) => ({ r, k: Math.random() }))
    .sort((a, b) => {
      if (a.r.co_attendance !== b.r.co_attendance) {
        return b.r.co_attendance - a.r.co_attendance;
      }
      if (a.r.sample_count !== b.r.sample_count) {
        return a.r.sample_count - b.r.sample_count;
      }
      return a.k - b.k;
    })
    .map((x) => x.r)
    .slice(0, 3);

  return apiSuccess({
    recommendations: ranked,
    sport_type: sportType,
    pool_size: candidates.length,
    /** evaluator 가 이 팀에서 출석한 경기 수 (디버그·UI 안내용). 0 이면 신규 회원 폴백 모드 */
    evaluator_attended_count: myMatchIds.length,
  });
}
