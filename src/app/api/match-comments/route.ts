import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("match_comments")
    .select("id, match_id, user_id, content, created_at, users(name)")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) return apiError(error.message);
  return apiSuccess({ comments: data ?? [] });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  if (ctx.isDemo) return apiError("데모 모드에서는 댓글을 작성할 수 없습니다", 403);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { matchId, content } = await request.json();
  if (!matchId || !content?.trim()) return apiError("matchId and content required");

  const { data, error } = await db
    .from("match_comments")
    .insert({ match_id: matchId, user_id: ctx.userId, content: content.trim() })
    .select("id, match_id, user_id, content, created_at, users(name)")
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data, 201);
}

export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 본인 댓글만 삭제 가능
  const { error } = await db
    .from("match_comments")
    .delete()
    .eq("id", id)
    .eq("user_id", ctx.userId);

  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
