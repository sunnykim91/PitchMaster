import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isStaffOrAbove } from "@/lib/permissions";

/**
 * PUT /api/goals/reorder
 * body: { matchId: string, goalIds: string[] }
 * goalIds 배열의 순서대로 match_goals.display_order 를 0부터 할당.
 * 운영진 이상 권한 + 해당 팀 경기 소유 검증.
 */
export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  if (!isStaffOrAbove(ctx.teamRole)) {
    return apiError("운영진만 순서를 변경할 수 있습니다", 403);
  }

  const body = await request.json().catch(() => null);
  const matchId = body?.matchId as string | undefined;
  const goalIds = body?.goalIds as string[] | undefined;
  if (!matchId || !Array.isArray(goalIds) || goalIds.length === 0) {
    return apiError("matchId와 goalIds가 필요합니다", 400);
  }

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 경기가 해당 팀 소속인지 확인
  const { data: matchCheck } = await db
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!matchCheck) return apiError("Match not found", 404);

  // 요청된 goalIds 가 실제로 이 경기의 골들인지 확인
  const { data: existingGoals } = await db
    .from("match_goals")
    .select("id")
    .eq("match_id", matchId);
  const existingSet = new Set((existingGoals ?? []).map((g) => g.id));
  for (const id of goalIds) {
    if (!existingSet.has(id)) {
      return apiError("요청한 골이 이 경기에 존재하지 않습니다", 400);
    }
  }

  // 순서대로 display_order 업데이트 (병렬)
  const results = await Promise.all(
    goalIds.map((id, idx) =>
      db.from("match_goals").update({ display_order: idx }).eq("id", id).eq("match_id", matchId)
    )
  );
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) return apiError(firstError.message);

  return apiSuccess({ ok: true, updated: goalIds.length });
}
