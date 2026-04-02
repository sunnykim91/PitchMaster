import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** 투표 즉시 마감 (운영진 이상) */
export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const { pollId } = await request.json();
  if (!pollId) return apiError("pollId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 투표 존재 + 팀 확인
  const { data: poll } = await db
    .from("post_polls")
    .select("id, post_id")
    .eq("id", pollId)
    .single();
  if (!poll) return apiError("Poll not found", 404);

  const { data: post } = await db
    .from("posts")
    .select("team_id")
    .eq("id", poll.post_id)
    .single();
  if (!post || post.team_id !== ctx.teamId) return apiError("Forbidden", 403);

  // 운영진 권한 확인
  const { data: member } = await db
    .from("team_members")
    .select("role")
    .eq("team_id", ctx.teamId)
    .eq("user_id", ctx.userId)
    .single();
  if (!member || (member.role !== "PRESIDENT" && member.role !== "STAFF")) {
    return apiError("권한이 없습니다", 403);
  }

  // ends_at을 현재 시간으로 설정하여 즉시 마감
  const { error } = await db
    .from("post_polls")
    .update({ ends_at: new Date().toISOString() })
    .eq("id", pollId);

  if (error) return apiError(error.message);
  return apiSuccess({ closed: true });
}
