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
    .select("*, users(id, name, preferred_positions), member:member_id(id, pre_name, pre_phone, user_id, coach_positions, users(id, name, preferred_positions))");

  if (matchId) {
    // Verify match belongs to team
    const { data: matchCheck } = await db.from("matches").select("id").eq("id", matchId).eq("team_id", ctx.teamId).single();
    if (!matchCheck) return apiError("Match not found", 404);
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
  const { matchId, vote, targetUserId, memberId } = body;
  if (!matchId || !vote) return apiError("matchId and vote required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 대리 투표 또는 미연동 멤버 투표: 운영진 이상만 가능
  const isProxy = (targetUserId && targetUserId !== ctx.userId) || memberId;
  if (isProxy) {
    const { data: callerMember } = await db
      .from("team_members")
      .select("role")
      .eq("team_id", ctx.teamId)
      .eq("user_id", ctx.userId)
      .single();
    if (!callerMember || (callerMember.role !== "PRESIDENT" && callerMember.role !== "STAFF")) {
      return apiError("권한이 없습니다", 403);
    }
  } else {
    // 본인 투표: 팀 소속 + 마감시간 체크
    const { data: match } = await db
      .from("matches")
      .select("vote_deadline, team_id")
      .eq("id", matchId)
      .single();
    if (!match) return apiError("경기를 찾을 수 없습니다", 404);
    if (match.team_id !== ctx.teamId) return apiError("해당 팀의 경기가 아닙니다", 403);
    if (match.vote_deadline && new Date(match.vote_deadline) < new Date()) {
      return apiError("투표 마감 시간이 지났습니다", 400);
    }
  }

  // memberId가 있으면 team_members.id 기반 (미연동 멤버 포함)
  if (memberId) {
    const { data: memberRow } = await db
      .from("team_members")
      .select("user_id")
      .eq("id", memberId)
      .single();
    const linkedUserId = memberRow?.user_id || null;

    // 기존 레코드가 있으면 업데이트, 없으면 삽입 (원자적)
    // 먼저 기존 레코드 찾기 (member_id 또는 user_id)
    const { data: existing } = await db
      .from("match_attendance")
      .select("id")
      .eq("match_id", matchId)
      .or(`member_id.eq.${memberId}${linkedUserId ? `,user_id.eq.${linkedUserId}` : ""}`)
      .limit(1)
      .maybeSingle();

    const row = {
      match_id: matchId,
      user_id: linkedUserId,
      member_id: memberId,
      vote,
      voted_at: new Date().toISOString(),
    };

    const { data, error } = existing
      ? await db.from("match_attendance").update(row).eq("id", existing.id).select().single()
      : await db.from("match_attendance").insert(row).select().single();

    if (error) return apiError(error.message);
    return apiSuccess(data);
  }

  // user_id 기반 — member_id도 자동으로 채움
  const voteUserId = targetUserId || ctx.userId;

  const { data: memberRow } = await db
    .from("team_members")
    .select("id")
    .eq("team_id", ctx.teamId)
    .eq("user_id", voteUserId)
    .maybeSingle();
  const resolvedMemberId = memberRow?.id || null;

  // 기존 레코드 찾기 (user_id 또는 member_id)
  const { data: existing } = await db
    .from("match_attendance")
    .select("id")
    .eq("match_id", matchId)
    .or(`user_id.eq.${voteUserId}${resolvedMemberId ? `,member_id.eq.${resolvedMemberId}` : ""}`)
    .limit(1)
    .maybeSingle();

  const row = {
    match_id: matchId,
    user_id: voteUserId,
    member_id: resolvedMemberId,
    vote,
    voted_at: new Date().toISOString(),
  };

  const { data, error } = existing
    ? await db.from("match_attendance").update(row).eq("id", existing.id).select().single()
    : await db.from("match_attendance").insert(row).select().single();

  if (error) return apiError(error.message);
  return apiSuccess(data);
}
