import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
