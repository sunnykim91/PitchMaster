import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hasMinRole } from "@/lib/permissions";
import { safeRevalidatePlayer } from "@/lib/server/revalidatePlayer";

type PlayerRatingRow = {
  id: string;
  team_id: string;
  match_id: string;
  ratee_id: string;
  rater_id: string;
  score: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

type Identity = { id: string; name: string | null };

type RatingResponse = PlayerRatingRow & {
  rater: Identity | null;
  ratee: Identity | null;
};

/**
 * 평점은 누구나 조회 가능, 코멘트는 평가 대상 본인 또는 STAFF+에만 노출.
 * 서버 사이드 마스킹 필수 — 클라 마스킹 금지.
 */
function maskComment(
  row: RatingResponse,
  viewerId: string,
  viewerIsStaff: boolean,
): RatingResponse {
  if (viewerIsStaff) return row;
  if (row.ratee_id === viewerId) return row;
  return { ...row, comment: null };
}

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 팀 토글 가드
  const { data: teamRow } = await db
    .from("teams")
    .select("player_rating_enabled")
    .eq("id", ctx.teamId)
    .single();

  if (!teamRow?.player_rating_enabled) {
    return apiError("RATING_DISABLED", 403);
  }

  const matchId = request.nextUrl.searchParams.get("matchId");
  const memberId = request.nextUrl.searchParams.get("memberId");
  const seasonId = request.nextUrl.searchParams.get("seasonId");

  const viewerIsStaff = hasMinRole(ctx.teamRole, "STAFF");

  // 경기 단위 조회
  if (matchId) {
    const { data: matchCheck } = await db
      .from("matches")
      .select("id")
      .eq("id", matchId)
      .eq("team_id", ctx.teamId)
      .single();
    if (!matchCheck) return apiError("Match not found", 404);

    const { data, error } = await db
      .from("player_ratings")
      .select(
        "*, rater:rater_id(id, name), ratee:ratee_id(id, name)",
      )
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    if (error) return apiError(error.message);

    const masked = (data as RatingResponse[] | null ?? []).map((row) =>
      maskComment(row, ctx.userId, viewerIsStaff),
    );
    return apiSuccess({ ratings: masked });
  }

  // 시즌 집계 조회 (memberId 기준)
  if (memberId) {
    // member가 본 팀 소속인지 검증
    const { data: memberCheck } = await db
      .from("team_members")
      .select("id, user_id")
      .eq("user_id", memberId)
      .eq("team_id", ctx.teamId)
      .maybeSingle();
    if (!memberCheck) return apiError("Member not found", 404);

    let query = db
      .from("player_ratings")
      .select(
        "*, rater:rater_id(id, name), ratee:ratee_id(id, name), matches!inner(id, season_id)",
      )
      .eq("ratee_id", memberId)
      .eq("team_id", ctx.teamId);

    if (seasonId) {
      query = query.eq("matches.season_id", seasonId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return apiError(error.message);

    const rows = (data as RatingResponse[] | null) ?? [];
    const count = rows.length;
    const avg =
      count > 0
        ? Math.round((rows.reduce((sum, r) => sum + Number(r.score), 0) / count) * 10) / 10
        : null;

    const recentMasked = rows
      .slice(0, 10)
      .map((row) => maskComment(row, ctx.userId, viewerIsStaff));

    return apiSuccess({
      avgRating: avg,
      ratingCount: count,
      recent: recentMasked,
    });
  }

  return apiError("matchId or memberId required");
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 토글 + 권한 가드
  const { data: teamRow } = await db
    .from("teams")
    .select("player_rating_enabled")
    .eq("id", ctx.teamId)
    .single();
  if (!teamRow?.player_rating_enabled) return apiError("RATING_DISABLED", 403);
  if (!hasMinRole(ctx.teamRole, "STAFF")) {
    return apiError("운영진 이상만 평점을 남길 수 있습니다", 403);
  }

  const body = await request.json().catch(() => null);
  if (!body) return apiError("Invalid JSON body");

  const { matchId, rateeId, score, comment } = body as {
    matchId?: string;
    rateeId?: string;
    score?: number;
    comment?: string | null;
  };

  if (!matchId || !rateeId || typeof score !== "number") {
    return apiError("matchId, rateeId, score required");
  }

  // 서버 사이드 점수 재검증 — DB CHECK 보강
  if (score < 1.0 || score > 10.0) {
    return apiError("평점은 1.0~10.0 범위여야 합니다", 400);
  }
  if (Math.round(score * 10) !== score * 10) {
    return apiError("평점은 소수점 한 자리까지만 입력 가능합니다", 400);
  }

  const normalizedComment =
    typeof comment === "string" ? comment.trim() : null;
  if (normalizedComment !== null && normalizedComment.length > 500) {
    return apiError("코멘트는 500자 이내여야 합니다", 400);
  }

  // 경기·평가 대상 자기 팀 소속 검증
  const { data: matchCheck } = await db
    .from("matches")
    .select("id, status")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!matchCheck) return apiError("Match not found", 404);

  const { data: rateeCheck } = await db
    .from("team_members")
    .select("id")
    .eq("user_id", rateeId)
    .eq("team_id", ctx.teamId)
    .maybeSingle();
  if (!rateeCheck) return apiError("Ratee not in team", 404);

  // UPSERT — (match_id, ratee_id, rater_id) 유니크
  const { data, error } = await db
    .from("player_ratings")
    .upsert(
      {
        team_id: ctx.teamId,
        match_id: matchId,
        ratee_id: rateeId,
        rater_id: ctx.userId,
        score,
        comment: normalizedComment && normalizedComment.length > 0 ? normalizedComment : null,
      },
      { onConflict: "match_id,ratee_id,rater_id" },
    )
    .select("*, rater:rater_id(id, name), ratee:ratee_id(id, name)")
    .single();

  if (error) return apiError(error.message);

  safeRevalidatePlayer(rateeId);
  return apiSuccess({ rating: data });
}
