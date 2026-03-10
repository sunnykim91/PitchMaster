import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const postId = request.nextUrl.searchParams.get("postId");
  if (!postId) return apiError("postId required");

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ comments: [], demo: true });

  const { data, error } = await db
    .from("post_comments")
    .select("*, author:author_id(name)")
    .eq("post_id", postId)
    .order("created_at");

  if (error) return apiError(error.message);
  return apiSuccess({ comments: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  if (!body.postId || !body.content)
    return apiError("postId and content required");

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ id: "demo", demo: true }, 201);

  const { data, error } = await db
    .from("post_comments")
    .insert({
      post_id: body.postId,
      author_id: ctx.userId,
      content: body.content,
    })
    .select("*, author:author_id(name)")
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data, 201);
}
