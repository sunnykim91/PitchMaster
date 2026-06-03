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

  const { data: matchCheck } = await db
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!matchCheck) return apiError("Match not found", 404);

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

  const rows: { match_id: string; side: string; player_id: string }[] = [];
  for (const playerId of teams.A ?? []) {
    rows.push({ match_id: matchId, side: "A", player_id: playerId });
  }
  for (const playerId of teams.B ?? []) {
    rows.push({ match_id: matchId, side: "B", player_id: playerId });
  }

  // 기존 편성 백업 → 삭제 → 삽입. 비원자적(트랜잭션 아님)이라 insert 실패 시 백업으로 복구해 편성 유실 방지.
  const { data: prevRows } = await db
    .from("match_internal_teams")
    .select("match_id, side, player_id")
    .eq("match_id", matchId);

  // delete 실패를 무시하면 insert 가 기존 행 위에 더해져 편성이 중복됨 → 오류 시 중단
  const { error: deleteErr } = await db.from("match_internal_teams").delete().eq("match_id", matchId);
  if (deleteErr) return apiError(deleteErr.message);

  if (rows.length > 0) {
    const { error } = await db.from("match_internal_teams").insert(rows);
    if (error) {
      // 복구: 방금 삭제한 기존 편성 되돌림 (유실 방지)
      if (prevRows && prevRows.length > 0) {
        await db.from("match_internal_teams").insert(prevRows);
      }
      return apiError(error.message);
    }
  }

  return apiSuccess({ ok: true, count: rows.length });
}
