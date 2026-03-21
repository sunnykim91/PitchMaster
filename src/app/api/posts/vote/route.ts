import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const { pollId, optionId } = await request.json();
  if (!pollId || !optionId) return apiError("pollId and optionId required", 400);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // Verify the poll exists and belongs to user's team
  const { data: poll } = await db
    .from("post_polls")
    .select("id, ends_at, post_id")
    .eq("id", pollId)
    .single();
  if (!poll) return apiError("Poll not found", 404);

  // Check if poll has expired
  if (poll.ends_at && new Date(poll.ends_at) < new Date()) {
    return apiError("투표가 마감되었습니다.", 400);
  }

  // Verify the post belongs to user's team
  const { data: post } = await db
    .from("posts")
    .select("team_id")
    .eq("id", poll.post_id)
    .single();
  if (!post || post.team_id !== ctx.teamId) return apiError("Forbidden", 403);

  // Check existing vote
  const { data: existing } = await db
    .from("post_poll_votes")
    .select("id, option_id")
    .eq("poll_id", pollId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (existing) {
    if (existing.option_id === optionId) {
      // Same option — unvote
      await db.from("post_poll_votes").delete().eq("id", existing.id);
      return apiSuccess({ voted: false });
    }
    // Different option — change vote
    const { error } = await db
      .from("post_poll_votes")
      .update({ option_id: optionId })
      .eq("id", existing.id);
    if (error) return apiError(error.message);
    return apiSuccess({ voted: true, changed: true });
  }

  // New vote
  const { error } = await db
    .from("post_poll_votes")
    .insert({ poll_id: pollId, option_id: optionId, user_id: ctx.userId });
  if (error) return apiError(error.message);
  return apiSuccess({ voted: true }, 201);
}
