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
    .select("*, users(id, name, preferred_positions), member:member_id(id, pre_name, pre_phone, user_id, users(id, name, preferred_positions))");

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

  // memberId가 있으면 team_members.id 기반 (미연동 멤버 포함)
  if (memberId) {
    // member의 user_id 조회
    const { data: memberRow } = await db
      .from("team_members")
      .select("user_id")
      .eq("id", memberId)
      .single();
    const linkedUserId = memberRow?.user_id || null;

    // member_id 또는 user_id로 기존 레코드 검색 (member_id 없이 user_id로만 생성된 레코드도 찾기)
    let existing = null;
    const { data: byMember } = await db
      .from("match_attendance")
      .select("id")
      .eq("match_id", matchId)
      .eq("member_id", memberId)
      .maybeSingle();
    existing = byMember;

    if (!existing && linkedUserId) {
      const { data: byUser } = await db
        .from("match_attendance")
        .select("id")
        .eq("match_id", matchId)
        .eq("user_id", linkedUserId)
        .maybeSingle();
      existing = byUser;
    }

    let data, error;
    if (existing) {
      ({ data, error } = await db
        .from("match_attendance")
        .update({ vote, member_id: memberId, user_id: linkedUserId, voted_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single());
    } else {
      ({ data, error } = await db
        .from("match_attendance")
        .insert({
          match_id: matchId,
          user_id: linkedUserId,
          member_id: memberId,
          vote,
          voted_at: new Date().toISOString(),
        })
        .select()
        .single());
    }
    if (error) return apiError(error.message);
    return apiSuccess(data);
  }

  // user_id 기반 — member_id도 자동으로 채움
  const voteUserId = targetUserId || ctx.userId;

  // 해당 유저의 team_members.id 조회
  const { data: memberRow } = await db
    .from("team_members")
    .select("id")
    .eq("team_id", ctx.teamId)
    .eq("user_id", voteUserId)
    .maybeSingle();
  const resolvedMemberId = memberRow?.id || null;

  // 기존 레코드 확인: member_id 또는 user_id로 찾기
  const { data: existing } = await db
    .from("match_attendance")
    .select("id")
    .eq("match_id", matchId)
    .or(`user_id.eq.${voteUserId}${resolvedMemberId ? `,member_id.eq.${resolvedMemberId}` : ""}`)
    .limit(1)
    .maybeSingle();

  let data, error;
  if (existing) {
    ({ data, error } = await db
      .from("match_attendance")
      .update({
        user_id: voteUserId,
        member_id: resolvedMemberId,
        vote,
        voted_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single());
  } else {
    ({ data, error } = await db
      .from("match_attendance")
      .insert({
        match_id: matchId,
        user_id: voteUserId,
        member_id: resolvedMemberId,
        vote,
        voted_at: new Date().toISOString(),
      })
      .select()
      .single());
  }

  if (error) return apiError(error.message);
  return apiSuccess(data);
}
