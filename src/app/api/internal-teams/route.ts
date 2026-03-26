import { NextRequest, NextResponse } from "next/server";
import { getApiContext, requireRole, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("match_internal_teams")
    .select("player_id, side")
    .eq("match_id", matchId);

  if (error) return apiError(error.message);
  return apiSuccess({ teams: data ?? [] });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_EDIT);
  if (roleCheck) return roleCheck;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { matchId, teams } = await request.json();
  if (!matchId || !teams) return apiError("matchId and teams required");

  // 경기가 자체전인지 확인
  const { data: match } = await db
    .from("matches")
    .select("match_type")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();

  if (!match || match.match_type !== "INTERNAL") {
    return apiError("자체전 경기만 팀 편성이 가능합니다", 400);
  }

  // 기존 편성 삭제 후 새로 삽입
  await db.from("match_internal_teams").delete().eq("match_id", matchId);

  const rows: { match_id: string; side: string; player_id: string }[] = [];
  for (const playerId of teams.A ?? []) {
    rows.push({ match_id: matchId, side: "A", player_id: playerId });
  }
  for (const playerId of teams.B ?? []) {
    rows.push({ match_id: matchId, side: "B", player_id: playerId });
  }

  if (rows.length > 0) {
    const { error } = await db.from("match_internal_teams").insert(rows);
    if (error) return apiError(error.message);
  }

  return apiSuccess({ ok: true, count: rows.length });
}
