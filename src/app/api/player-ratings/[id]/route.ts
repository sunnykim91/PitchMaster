import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hasMinRole } from "@/lib/permissions";
import { safeRevalidatePlayer } from "@/lib/server/revalidatePlayer";

/**
 * PUT/DELETE는 STAFF+ 누구나 모든 row 정정·삭제 가능 (오기재·악의 코멘트 대응).
 * rater_id 일치 강제 없음.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  if (!id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data: teamRow } = await db
    .from("teams")
    .select("player_rating_enabled")
    .eq("id", ctx.teamId)
    .single();
  if (!teamRow?.player_rating_enabled) return apiError("RATING_DISABLED", 403);
  if (!hasMinRole(ctx.teamRole, "STAFF")) {
    return apiError("운영진 이상만 평점을 수정할 수 있습니다", 403);
  }

  const { data: existing } = await db
    .from("player_ratings")
    .select("id, team_id, ratee_id")
    .eq("id", id)
    .single();
  if (!existing) return apiError("Rating not found", 404);
  if (existing.team_id !== ctx.teamId) return apiError("Forbidden", 403);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("Invalid JSON body");

  const updates: { score?: number; comment?: string | null } = {};

  if (typeof body.score === "number") {
    if (body.score < 1.0 || body.score > 10.0) {
      return apiError("평점은 1.0~10.0 범위여야 합니다", 400);
    }
    if (Math.round(body.score * 10) !== body.score * 10) {
      return apiError("평점은 소수점 한 자리까지만 입력 가능합니다", 400);
    }
    updates.score = body.score;
  }

  if (body.comment !== undefined) {
    const c = typeof body.comment === "string" ? body.comment.trim() : null;
    if (c !== null && c.length > 500) {
      return apiError("코멘트는 500자 이내여야 합니다", 400);
    }
    updates.comment = c && c.length > 0 ? c : null;
  }

  if (Object.keys(updates).length === 0) {
    return apiError("변경할 항목이 없습니다", 400);
  }

  const { data, error } = await db
    .from("player_ratings")
    .update(updates)
    .eq("id", id)
    .select("*, rater:rater_id(id, name), ratee:ratee_id(id, name)")
    .single();

  if (error) return apiError(error.message);

  safeRevalidatePlayer(existing.ratee_id);
  return apiSuccess({ rating: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  if (!id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data: teamRow } = await db
    .from("teams")
    .select("player_rating_enabled")
    .eq("id", ctx.teamId)
    .single();
  if (!teamRow?.player_rating_enabled) return apiError("RATING_DISABLED", 403);
  if (!hasMinRole(ctx.teamRole, "STAFF")) {
    return apiError("운영진 이상만 평점을 삭제할 수 있습니다", 403);
  }

  const { data: existing } = await db
    .from("player_ratings")
    .select("id, team_id, ratee_id")
    .eq("id", id)
    .single();
  if (!existing) return apiError("Rating not found", 404);
  if (existing.team_id !== ctx.teamId) return apiError("Forbidden", 403);

  const { error } = await db.from("player_ratings").delete().eq("id", id);
  if (error) return apiError(error.message);

  safeRevalidatePlayer(existing.ratee_id);
  return apiSuccess({ ok: true });
}
