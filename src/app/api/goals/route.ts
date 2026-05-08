import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isStaffOrAbove } from "@/lib/permissions";
import { invalidateTeamStats } from "@/lib/server/aiTeamStats";
import type { SupabaseClient } from "@supabase/supabase-js";

// /player/[memberId] 는 30분 ISR. 골 기록 변경 시 영향받는 선수 카드 즉시 갱신.
// page route 의 .or(`user_id.eq,id.eq`) 매칭 덕에 어느 쪽 ID 로 path 만들어도 hit.
// 사용자가 반대 ID 로 진입한 경우(드뭄)는 30분 자연 갱신에 의존.
// try/catch — vitest 등 next runtime context 없는 환경에서 invariant 실패 시 mutation 자체는 영향 없게.
function revalidatePlayers(ids: (string | null | undefined)[]) {
  for (const id of ids) {
    if (!id) continue;
    try {
      revalidatePath(`/player/${id}`);
    } catch (err) {
      console.warn("[revalidatePath] skip:", err instanceof Error ? err.message : err);
    }
  }
}

// 팀 설정에서 stats_recording_staff_only 가 true 면 STAFF 이상만 골 기록 가능
async function checkStatsRecordingPermission(
  db: SupabaseClient,
  teamId: string,
  teamRole: string
): Promise<NextResponse | null> {
  const { data: team } = await db
    .from("teams")
    .select("stats_recording_staff_only")
    .eq("id", teamId)
    .single();
  if (team?.stats_recording_staff_only && !isStaffOrAbove(teamRole as "PRESIDENT" | "STAFF" | "MEMBER")) {
    return apiError("운영진만 경기 기록을 입력할 수 있습니다", 403);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // Verify match belongs to team
  const { data: matchCheck } = await db.from("matches").select("id").eq("id", matchId).eq("team_id", ctx.teamId).single();
  if (!matchCheck) return apiError("Match not found", 404);

  // 정렬 우선순위: display_order가 설정된 것 먼저(오름차순) → NULL은 created_at으로 fallback
  // Supabase PostgREST의 order() nullsFirst 옵션 사용
  const { data, error } = await db
    .from("match_goals")
    .select("id, match_id, quarter_number, minute, scorer_id, assist_id, is_own_goal, goal_type, recorded_by, side, created_at, display_order")
    .eq("match_id", matchId)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) return apiError(error.message);
  return apiSuccess({ goals: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 팀 설정 기반 권한 체크
  const permErr = await checkStatsRecordingPermission(db, ctx.teamId, ctx.teamRole);
  if (permErr) return permErr;

  // Verify match belongs to team
  const { data: matchCheck } = await db.from("matches").select("id").eq("id", body.matchId).eq("team_id", ctx.teamId).single();
  if (!matchCheck) return apiError("Match not found", 404);

  const quarter = Number(body.quarter);
  if (!Number.isInteger(quarter) || quarter < 0 || quarter > 10) {
    return apiError("쿼터 번호가 올바르지 않습니다");
  }
  // 0 = 쿼터 모름 → DB에 null 저장
  const quarterValue = quarter === 0 ? null : quarter;

  if (!body.scorerId || typeof body.scorerId !== "string") {
    return apiError("득점자 정보가 필요합니다");
  }

  const goalType = body.goalType ?? "NORMAL";
  const isOwnGoal = goalType === "OWN_GOAL" || (body.isOwnGoal ?? false);

  const { data, error } = await db
    .from("match_goals")
    .insert({
      match_id: body.matchId,
      quarter_number: quarterValue,
      minute: body.minute ?? null,
      scorer_id: body.scorerId,
      assist_id: body.assistId || null,
      is_own_goal: isOwnGoal,
      goal_type: goalType,
      side: body.side ?? null,
      recorded_by: ctx.userId,
    })
    .select()
    .single();

  if (error) return apiError(error.message);
  invalidateTeamStats(ctx.teamId).catch(() => {});
  revalidatePlayers([body.scorerId, body.assistId]);
  return apiSuccess(data, 201);
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  if (!body.id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 팀 설정 기반 권한 체크
  const permErr = await checkStatsRecordingPermission(db, ctx.teamId, ctx.teamRole);
  if (permErr) return permErr;

  // Verify goal belongs to a match that belongs to this team
  const { data: goalCheck } = await db
    .from("match_goals")
    .select("id, matches!inner(team_id)")
    .eq("id", body.id)
    .eq("matches.team_id", ctx.teamId)
    .single();
  if (!goalCheck) return apiError("Match not found", 404);

  const updGoalType = body.goalType ?? "NORMAL";
  const updIsOwnGoal = updGoalType === "OWN_GOAL" || (body.isOwnGoal ?? false);

  const updQuarter = Number(body.quarter ?? 0);
  const updQuarterValue = updQuarter === 0 ? null : updQuarter;

  const { data, error } = await db
    .from("match_goals")
    .update({
      quarter_number: updQuarterValue,
      minute: body.minute ?? null,
      scorer_id: body.scorerId,
      assist_id: body.assistId || null,
      is_own_goal: updIsOwnGoal,
      goal_type: updGoalType,
      side: body.side ?? null,
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return apiError(error.message);
  invalidateTeamStats(ctx.teamId).catch(() => {});
  revalidatePlayers([body.scorerId, body.assistId]);
  return apiSuccess(data);
}

export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 팀 설정 기반 권한 체크
  const permErr = await checkStatsRecordingPermission(db, ctx.teamId, ctx.teamRole);
  if (permErr) return permErr;

  // Verify goal belongs to a match that belongs to this team + scorer/assist 캡처 (revalidate 용)
  const { data: goalCheck } = await db
    .from("match_goals")
    .select("id, scorer_id, assist_id, matches!inner(team_id)")
    .eq("id", id)
    .eq("matches.team_id", ctx.teamId)
    .single();
  if (!goalCheck) return apiError("Match not found", 404);

  const { error } = await db.from("match_goals").delete().eq("id", id);
  if (error) return apiError(error.message);
  invalidateTeamStats(ctx.teamId).catch(() => {});
  revalidatePlayers([
    (goalCheck as { scorer_id?: string | null }).scorer_id,
    (goalCheck as { assist_id?: string | null }).assist_id,
  ]);
  return apiSuccess({ ok: true });
}
