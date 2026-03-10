import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const category = request.nextUrl.searchParams.get("category");
  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ posts: [], demo: true });

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
  return apiSuccess({ posts: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ id: "demo", demo: true }, 201);

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
