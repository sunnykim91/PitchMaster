import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ attendance: [], demo: true });

  const { data, error } = await db
    .from("match_attendance")
    .select("*, users(id, name)")
    .eq("match_id", matchId);

  if (error) return apiError(error.message);
  return apiSuccess({ attendance: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const { matchId, vote } = body;
  if (!matchId || !vote) return apiError("matchId and vote required");

  // Check vote deadline
  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ ok: true, demo: true });

  const { data: match } = await db
    .from("matches")
    .select("vote_deadline")
    .eq("id", matchId)
    .single();
  if (match?.vote_deadline && new Date(match.vote_deadline) < new Date()) {
    return apiError("투표 마감 시간이 지났습니다", 400);
  }

  const { data, error } = await db
    .from("match_attendance")
    .upsert(
      {
        match_id: matchId,
        user_id: ctx.userId,
        vote,
        voted_at: new Date().toISOString(),
      },
      { onConflict: "match_id,user_id" }
    )
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data);
}
