import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const postId = body.postId;
  if (!postId) return apiError("postId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 본인 팀 게시글인지 검증 — service_role 이 RLS 우회하므로 타팀 게시글 좋아요 차단
  const { data: postCheck } = await db.from("posts").select("id").eq("id", postId).eq("team_id", ctx.teamId).single();
  if (!postCheck) return apiError("Post not found", 404);

  // Check if already liked
  const { data: existing } = await db
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (existing) {
    // Unlike
    await db.from("post_likes").delete().eq("id", existing.id);
    return apiSuccess({ liked: false });
  }

  // Like
  const { error } = await db
    .from("post_likes")
    .insert({ post_id: postId, user_id: ctx.userId });
  if (error) return apiError(error.message);
  return apiSuccess({ liked: true }, 201);
}
