import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  let query = db
    .from("match_attendance")
    .select("*, users(id, name, preferred_positions)");

  if (matchId) {
    query = query.eq("match_id", matchId);
  } else {
    // 팀의 모든 경기 출석 데이터 조회
    const { data: matches } = await db
      .from("matches")
      .select("id")
      .eq("team_id", ctx.teamId);
    const matchIds = matches?.map((m) => m.id) ?? [];
    if (matchIds.length === 0) return apiSuccess({ attendance: [] });
    query = query.in("match_id", matchIds);
  }

  const { data, error } = await query;

  if (error) return apiError(error.message);
  return apiSuccess({ attendance: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const { matchId, vote, targetUserId } = body;
  if (!matchId || !vote) return apiError("matchId and vote required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 대리 투표: 운영진 이상만 가능
  let voteUserId = ctx.userId;
  if (targetUserId && targetUserId !== ctx.userId) {
    const { data: member } = await db
      .from("team_members")
      .select("role")
      .eq("team_id", ctx.teamId)
      .eq("user_id", ctx.userId)
      .single();
    if (!member || (member.role !== "PRESIDENT" && member.role !== "STAFF")) {
      return apiError("권한이 없습니다", 403);
    }
    voteUserId = targetUserId;
  } else {
    // 본인 투표: 마감시간 체크
    const { data: match } = await db
      .from("matches")
      .select("vote_deadline")
      .eq("id", matchId)
      .single();
    if (match?.vote_deadline && new Date(match.vote_deadline) < new Date()) {
      return apiError("투표 마감 시간이 지났습니다", 400);
    }
  }

  const { data, error } = await db
    .from("match_attendance")
    .upsert(
      {
        match_id: matchId,
        user_id: voteUserId,
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
