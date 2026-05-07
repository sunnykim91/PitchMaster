import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { invalidateTeamStats } from "@/lib/server/aiTeamStats";

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, "STAFF");
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const { matchId, userId, memberId, attended, status } = body;
  // status: "PRESENT" | "LATE" | "ABSENT" (새 방식), attended: boolean (하위 호환)
  if (!matchId || (!userId && !memberId)) return apiError("matchId and (userId or memberId) required");
  const attendanceStatus = status ?? (attended ? "PRESENT" : "ABSENT");
  const actuallyAttended = attendanceStatus === "PRESENT" || attendanceStatus === "LATE";

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data: matchCheck } = await db
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!matchCheck) return apiError("Match not found", 404);

  // 기존 레코드 찾기: user_id 또는 member_id로 검색
  let query = db
    .from("match_attendance")
    .select("id")
    .eq("match_id", matchId);

  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("member_id", memberId);
  }

  const { data: existing } = await query.limit(1).maybeSingle();

  if (existing) {
    // 기존 레코드 업데이트 (vote는 건드리지 않음)
    const { error } = await db
      .from("match_attendance")
      .update({ actually_attended: actuallyAttended, attendance_status: attendanceStatus })
      .eq("id", existing.id);

    if (error) return apiError(error.message);
  } else {
    // 투표 레코드 없으면 새로 생성
    const { error } = await db
      .from("match_attendance")
      .insert({
        match_id: matchId,
        user_id: userId || null,
        member_id: memberId || null,
        vote: "ATTEND",
        actually_attended: actuallyAttended,
        attendance_status: attendanceStatus,
        voted_at: new Date().toISOString(),
      });

    if (error) return apiError(error.message);
  }

  // 벌금 자동 생성 (지각/불참 시)
  if (attendanceStatus === "LATE" || attendanceStatus === "ABSENT") {
    const targetUserId = userId || null;
    if (targetUserId) {
      await generatePenalty(db, ctx.teamId, matchId, targetUserId, attendanceStatus);
    }
  }

  // attendance_status 변경은 MVP 70% threshold 결정에 영향 → 캐시 무효화
  invalidateTeamStats(ctx.teamId).catch(() => {});

  return apiSuccess({ ok: true });
}

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data: matchCheck } = await db
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!matchCheck) return apiError("Match not found", 404);

  const { data, error } = await db
    .from("match_attendance")
    .select("*, users(id, name)")
    .eq("match_id", matchId)
    .not("actually_attended", "is", null);

  if (error) return apiError(error.message);
  return apiSuccess({ attendance: data });
}

/** 출석 체크 시 벌금 자동 생성 (지각/불참) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generatePenalty(db: any, teamId: string, matchId: string, targetUserId: string, status: string) {
  try {
    // DORMANT/PENDING/BANNED 회원이면 벌금 생성 안 함 (ACTIVE 만 대상)
    const { data: memberRow } = await db
      .from("team_members")
      .select("status")
      .eq("team_id", teamId)
      .eq("user_id", targetUserId)
      .maybeSingle();
    if (!memberRow || memberRow.status !== "ACTIVE") return;

    // 면제/휴회/부상 회원이면 벌금 생성 안 함
    const { data: exemption } = await db
      .from("member_dues_exemptions")
      .select("id")
      .eq("team_id", teamId)
      .eq("member_id", targetUserId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (exemption) return;

    const triggerType = status === "LATE" ? "LATE" : "ABSENT";

    // 해당 트리거의 활성 규칙 조회
    const { data: rule } = await db
      .from("penalty_rules")
      .select("id, amount, name")
      .eq("team_id", teamId)
      .eq("trigger_type", triggerType)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!rule) return;

    // 중복 체크
    const { data: existing } = await db
      .from("penalty_records")
      .select("id")
      .eq("match_id", matchId)
      .eq("member_id", targetUserId)
      .eq("rule_id", rule.id)
      .limit(1)
      .maybeSingle();

    if (existing) return;

    // 경기 날짜 조회
    const { data: match } = await db
      .from("matches")
      .select("match_date, opponent_name")
      .eq("id", matchId)
      .single();

    const matchDate = match?.match_date ?? new Date().toISOString().slice(0, 10);
    const opponent = match?.opponent_name ?? "경기";
    const label = triggerType === "LATE" ? "지각" : "불참";

    await db.from("penalty_records").insert({
      team_id: teamId,
      match_id: matchId,
      member_id: targetUserId,
      rule_id: rule.id,
      amount: rule.amount,
      date: matchDate,
      note: `${matchDate} vs ${opponent} ${label}`,
      status: "UNPAID",
      is_paid: false,
    });
  } catch {
    // 벌금 생성 실패해도 출석 체크는 성공으로 처리
  }
}
