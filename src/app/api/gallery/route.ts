import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * 팀 전체 경기 사진 갤러리
 * match_diaries.photos 를 모아서 match_date 내림차순으로 반환.
 *
 * 응답:
 *   {
 *     matches: [
 *       {
 *         matchId, matchDate, matchTime, opponentName, matchType,
 *         photos: string[]
 *       },
 *       ...
 *     ],
 *     totalPhotos: number,
 *   }
 */
export async function GET(_request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 팀의 모든 경기 + 일지(사진 포함) 조회
  // matches(team_id) ← match_diaries(match_id)
  const { data, error } = await db
    .from("match_diaries")
    .select("match_id, photos, matches!inner(id, match_date, match_time, opponent_name, match_type, team_id)")
    .eq("matches.team_id", ctx.teamId)
    .not("photos", "is", null);

  if (error) return apiError(error.message);

  type Row = {
    match_id: string;
    photos: string[] | null;
    matches: {
      id: string;
      match_date: string;
      match_time: string | null;
      opponent_name: string | null;
      match_type: string | null;
      team_id: string;
    };
  };

  const rows = (data ?? []) as unknown as Row[];

  const matches = rows
    .filter((r) => Array.isArray(r.photos) && r.photos.length > 0)
    .map((r) => ({
      matchId: r.match_id,
      matchDate: r.matches.match_date,
      matchTime: r.matches.match_time,
      opponentName: r.matches.opponent_name,
      matchType: (r.matches.match_type ?? "REGULAR") as "REGULAR" | "INTERNAL" | "EVENT",
      photos: r.photos ?? [],
    }))
    .sort((a, b) => (a.matchDate < b.matchDate ? 1 : -1));

  const totalPhotos = matches.reduce((sum, m) => sum + m.photos.length, 0);

  return apiSuccess({ matches, totalPhotos });
}
