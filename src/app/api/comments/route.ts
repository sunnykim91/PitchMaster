import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isStaffOrAbove } from "@/lib/permissions";
import { validateFreeText } from "@/lib/validators/safeText";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const postId = request.nextUrl.searchParams.get("postId");
  if (!postId) return apiError("postId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data: postCheck } = await db.from("posts").select("id").eq("id", postId).eq("team_id", ctx.teamId).single();
  if (!postCheck) return apiError("Post not found", 404);

  const { data, error } = await db
    .from("post_comments")
    .select("*, author:author_id(name, profile_image_url)")
    .eq("post_id", postId)
    .order("created_at");

  if (error) return apiError(error.message);
  return apiSuccess({ comments: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  if (!body.postId) return apiError("postId required");
  const contentCheck = validateFreeText(body.content, { maxLength: 1000, fieldLabel: "댓글" });
  if (!contentCheck.ok) return apiError(contentCheck.reason);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("post_comments")
    .insert({
      post_id: body.postId,
      author_id: ctx.userId,
      content: contentCheck.value,
    })
    .select("*, author:author_id(name, profile_image_url)")
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data, 201);
}

export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;
  const db = getSupabaseAdmin();
  if (!db) return apiError("DB unavailable", 503);

  const { id } = await request.json();
  if (!id) return apiError("Missing id", 400);

  const { data: comment } = await db
    .from("post_comments")
    .select("author_id, posts!inner(team_id)")
    .eq("id", id)
    .eq("posts.team_id", ctx.teamId)
    .single();
  if (!comment) return apiError("Comment not found", 404);

  const isAuthor = comment.author_id === ctx.userId;
  const isStaff = isStaffOrAbove(ctx.teamRole);
  if (!isAuthor && !isStaff) return apiError("Forbidden", 403);

  const { error } = await db.from("post_comments").delete().eq("id", id);
  if (error) return apiError(error.message, 500);

  return apiSuccess({ ok: true });
}
