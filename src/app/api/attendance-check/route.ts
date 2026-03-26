import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, "STAFF");
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const { matchId, userId, memberId, attended } = body;
  if (!matchId || (!userId && !memberId)) return apiError("matchId and (userId or memberId) required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 기존 레코드 찾기: user_id 또는 member_id로 검색
  let query = db
    .from("match_attendance")
    .select("id")
    .eq("match_id", matchId);

  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("member_id", memberId);
  }

  const { data: existing } = await query.limit(1).maybeSingle();

  if (existing) {
    // 기존 레코드 업데이트 (vote는 건드리지 않음)
    const { error } = await db
      .from("match_attendance")
      .update({ actually_attended: attended ?? true })
      .eq("id", existing.id);

    if (error) return apiError(error.message);
  } else {
    // 투표 레코드 없으면 새로 생성
    const { error } = await db
      .from("match_attendance")
      .insert({
        match_id: matchId,
        user_id: userId || null,
        member_id: memberId || null,
        vote: "ATTEND",
        actually_attended: attended ?? true,
        voted_at: new Date().toISOString(),
      });

    if (error) return apiError(error.message);
  }

  return apiSuccess({ ok: true });
}

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("match_attendance")
    .select("*, users(id, name)")
    .eq("match_id", matchId)
    .not("actually_attended", "is", null);

  if (error) return apiError(error.message);
  return apiSuccess({ attendance: data });
}
