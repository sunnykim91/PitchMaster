import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { validateFreeText } from "@/lib/validators/safeText";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data: matchCheck } = await db
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!matchCheck) return apiError("Match not found", 404);

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
  if (!matchId) return apiError("matchId required");
  const contentCheck = validateFreeText(content, { maxLength: 2000, fieldLabel: "댓글" });
  if (!contentCheck.ok) return apiError(contentCheck.reason);

  const { data: matchCheck } = await db
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!matchCheck) return apiError("Match not found", 404);

  const { data, error } = await db
    .from("match_comments")
    .insert({ match_id: matchId, user_id: ctx.userId, content: contentCheck.value })
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

  // 1) 댓글 → 경기 → 팀 소속 검증 (cross-team 삭제 방지)
  const { data: commentRow } = await db
    .from("match_comments")
    .select("id, user_id, match_id, matches!inner(team_id)")
    .eq("id", id)
    .single<{ id: string; user_id: string; match_id: string; matches: { team_id: string } }>();
  if (!commentRow) return apiError("댓글을 찾을 수 없습니다", 404);
  if (commentRow.matches.team_id !== ctx.teamId) {
    return apiError("해당 팀의 댓글이 아닙니다", 403);
  }

  // 2) 본인 댓글이거나 운영진(STAFF+) 만 삭제 가능
  const isOwn = commentRow.user_id === ctx.userId;
  const isStaff = ctx.teamRole === "PRESIDENT" || ctx.teamRole === "STAFF";
  if (!isOwn && !isStaff) {
    return apiError("본인 댓글이거나 운영진만 삭제할 수 있습니다", 403);
  }

  const { error } = await db.from("match_comments").delete().eq("id", id);

  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
