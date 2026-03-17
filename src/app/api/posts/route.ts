import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isStaffOrAbove } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const category = request.nextUrl.searchParams.get("category");
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  let query = db
    .from("posts")
    .select(
      "*, author:author_id(name), post_likes(count), post_comments(count)"
    )
    .eq("team_id", ctx.teamId)
    .order("created_at", { ascending: false });

  if (category && category !== "ALL") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) return apiError(error.message);

  // Supabase returns aggregated counts as [{ count: N }] — flatten
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const posts = (data ?? []).map((row: any) => ({
    ...row,
    likes_count: row.post_likes?.[0]?.count ?? 0,
    comments_count: row.post_comments?.[0]?.count ?? 0,
  }));

  return apiSuccess({ posts });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("posts")
    .insert({
      team_id: ctx.teamId,
      author_id: ctx.userId,
      title: body.title,
      content: body.content,
      category: body.category || "FREE",
      image_urls: body.imageUrls || [],
    })
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data, 201);
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;
  const db = getSupabaseAdmin();
  if (!db) return apiError("DB unavailable", 503);

  const body = await request.json();
  const { id, title, content, category, imageUrls } = body;
  if (!id) return apiError("Missing id", 400);

  // Check ownership
  const { data: post } = await db.from("posts").select("author_id").eq("id", id).single();
  if (!post) return apiError("Post not found", 404);

  // Author or staff can edit
  const isAuthor = post.author_id === ctx.userId;
  const isStaff = isStaffOrAbove(ctx.teamRole);
  if (!isAuthor && !isStaff) return apiError("Forbidden", 403);

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (category !== undefined) updateData.category = category;
  if (imageUrls !== undefined) updateData.image_urls = imageUrls;
  updateData.updated_at = new Date().toISOString();

  const { error } = await db.from("posts").update(updateData).eq("id", id);
  if (error) return apiError(error.message, 500);

  return apiSuccess({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;
  const db = getSupabaseAdmin();
  if (!db) return apiError("DB unavailable", 503);

  const { id } = await request.json();
  if (!id) return apiError("Missing id", 400);

  const { data: post } = await db.from("posts").select("author_id").eq("id", id).single();
  if (!post) return apiError("Post not found", 404);

  const isAuthor = post.author_id === ctx.userId;
  const isStaff = isStaffOrAbove(ctx.teamRole);
  if (!isAuthor && !isStaff) return apiError("Forbidden", 403);

  // Delete related records first, then post
  await db.from("post_comments").delete().eq("post_id", id);
  await db.from("post_likes").delete().eq("post_id", id);
  const { error } = await db.from("posts").delete().eq("id", id);
  if (error) return apiError(error.message, 500);

  return apiSuccess({ ok: true });
}
