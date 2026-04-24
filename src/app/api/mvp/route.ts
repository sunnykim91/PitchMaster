import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hasMinRole } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 경기가 현재 팀 소속인지 검증
  const { data: matchCheck } = await db
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!matchCheck) return apiError("Match not found", 404);

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

  // 경기가 현재 팀 소속인지 + 완료 상태인지 검증
  const { data: matchCheck } = await db
    .from("matches")
    .select("id, status")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!matchCheck) return apiError("Match not found", 404);
  if (matchCheck.status !== "COMPLETED") {
    return apiError("완료된 경기에만 MVP 투표가 가능합니다", 400);
  }

  // 팀 MVP 투표 설정 조회 (운영진 전용 여부)
  const { data: teamSettings } = await db
    .from("teams")
    .select("mvp_vote_staff_only")
    .eq("id", ctx.teamId)
    .single();

  const isStaff = hasMinRole(ctx.teamRole, "STAFF");
  const mvpVoteStaffOnly = teamSettings?.mvp_vote_staff_only ?? false;

  // 운영진 전용 설정이 켜져 있으면 STAFF 이상만 가능
  if (mvpVoteStaffOnly && !isStaff) {
    return apiError("MVP 투표는 운영진 이상만 가능합니다", 403);
  }

  // 운영진이 아닌 경우: 참석 여부 검증
  if (!isStaff) {
    const { data: attendance } = await db
      .from("match_attendance")
      .select("vote")
      .eq("match_id", matchId)
      .eq("user_id", ctx.userId)
      .single();

    if (!attendance || attendance.vote !== "ATTEND") {
      return apiError("해당 경기 참석자만 MVP 투표가 가능합니다", 403);
    }
  }

  // 운영진 투표는 is_staff_decision = true → 즉시 MVP 확정
  const isStaffDecision = isStaff;

  const { data, error } = await db
    .from("match_mvp_votes")
    .upsert(
      {
        match_id: matchId,
        voter_id: ctx.userId,
        candidate_id: candidateId,
        is_staff_decision: isStaffDecision,
      },
      { onConflict: "match_id,voter_id" }
    )
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data);
}

export async function DELETE(request: NextRequest) {
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

  const { data: teamSettings } = await db
    .from("teams")
    .select("mvp_vote_staff_only")
    .eq("id", ctx.teamId)
    .single();

  const isStaff = hasMinRole(ctx.teamRole, "STAFF");
  const mvpVoteStaffOnly = teamSettings?.mvp_vote_staff_only ?? false;

  if (mvpVoteStaffOnly && !isStaff) {
    return apiError("MVP 투표는 운영진 이상만 가능합니다", 403);
  }

  // 본인이 이 경기에 남긴 표 삭제. 없으면 조용히 성공 처리.
  const { error } = await db
    .from("match_mvp_votes")
    .delete()
    .eq("match_id", matchId)
    .eq("voter_id", ctx.userId);

  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
