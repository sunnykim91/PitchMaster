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
  if (!db) return apiSuccess({ liked: true, demo: true });

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
