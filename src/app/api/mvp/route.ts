import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("match_mvp_votes")
    .select("*, users:candidate_id(id, name)")
    .eq("match_id", matchId);

  if (error) return apiError(error.message);
  return apiSuccess({ votes: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const { matchId, candidateId } = body;
  if (!matchId || !candidateId)
    return apiError("matchId and candidateId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // Verify voter attended the match
  const { data: attendance } = await db
    .from("match_attendance")
    .select("vote")
    .eq("match_id", matchId)
    .eq("user_id", ctx.userId)
    .single();

  if (!attendance || attendance.vote !== "ATTEND") {
    return apiError("해당 경기 참석자만 MVP 투표가 가능합니다", 403);
  }

  const { data, error } = await db
    .from("match_mvp_votes")
    .upsert(
      {
        match_id: matchId,
        voter_id: ctx.userId,
        candidate_id: candidateId,
      },
      { onConflict: "match_id,voter_id" }
    )
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data);
}
