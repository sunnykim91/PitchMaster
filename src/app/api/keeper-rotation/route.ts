import { NextRequest, NextResponse } from "next/server";
import { getApiContext, requireRole, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { isValidUuid } from "@/lib/validators/uuid";

/**
 * GET /api/keeper-rotation?matchId=X
 *   → { rotation: { keepers: string[], groups: Record<side|"TEAM", string[]> } | null }
 *
 * POST /api/keeper-rotation  { matchId, keepers, groups }
 *   풋살 순번 룰렛 저장. STAFF+ 만. 배열 순서 = 순번.
 *
 * 풋살 전용 기능이지만 종목 게이팅은 클라이언트(전술 탭)에서 처리 — API는 팀 소속만 검증.
 */

const ALLOWED_GROUPS = ["A", "B", "C", "TEAM"];

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId || !isValidUuid(matchId)) return apiError("invalid matchId");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data: match } = await db
    .from("matches")
    .select("keeper_rotation, team_id")
    .eq("id", matchId)
    .single();
  if (!match || match.team_id !== ctx.teamId) return apiError("Match not found", 404);

  return apiSuccess({ rotation: match.keeper_rotation ?? null });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_EDIT);
  if (roleCheck) return roleCheck;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { matchId, keepers, groups } = await request.json();
  if (!matchId || !isValidUuid(matchId)) return apiError("invalid matchId");
  if (!Array.isArray(keepers) || typeof groups !== "object" || groups === null) {
    return apiError("keepers(array), groups(object) required");
  }

  // 팀 소속 경기인지 검증
  const { data: match } = await db
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!match) return apiError("Match not found", 404);

  // 형태 정제 — 문자열 id 만, 허용 그룹 키만
  const cleanKeepers = (keepers as unknown[]).filter((k): k is string => typeof k === "string");
  const cleanGroups: Record<string, string[]> = {};
  for (const [key, val] of Object.entries(groups as Record<string, unknown>)) {
    if (!ALLOWED_GROUPS.includes(key) || !Array.isArray(val)) continue;
    cleanGroups[key] = (val as unknown[]).filter((x): x is string => typeof x === "string");
  }

  const payload = { keepers: cleanKeepers, groups: cleanGroups };
  const { error } = await db
    .from("matches")
    .update({ keeper_rotation: payload })
    .eq("id", matchId)
    .eq("team_id", ctx.teamId);
  if (error) return apiError(error.message);

  return apiSuccess({ ok: true });
}
