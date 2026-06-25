import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // select("*") intentional: all notification columns are returned to the client
  const { data, error } = await db
    .from("notifications")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return apiError(error.message);
  return apiSuccess({ notifications: data });
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  if (body.markAllSeen) {
    // 패널 열기 = "확인함" — 뱃지(개수)만 0으로. 항목 읽음(is_read)은 그대로 둔다.
    const { error } = await db
      .from("notifications")
      .update({ is_seen: true })
      .eq("user_id", ctx.userId)
      .eq("is_seen", false);
    if (error) return apiError(error.message);
  } else if (body.markAllRead || body.all) {
    // 전체 읽음 — read 는 seen 을 함의하므로 둘 다 true (read ⊆ seen 불변식).
    const { error } = await db
      .from("notifications")
      .update({ is_read: true, is_seen: true })
      .eq("user_id", ctx.userId);
    if (error) return apiError(error.message);
  } else if (body.id) {
    const isRead = body.isRead ?? true;
    // 읽음 처리 시 seen 도 같이 true. 읽지 않음 처리(isRead=false)는 seen 을 건드리지 않는다.
    const update = isRead ? { is_read: true, is_seen: true } : { is_read: false };
    const { error } = await db
      .from("notifications")
      .update(update)
      .eq("id", body.id)
      .eq("user_id", ctx.userId);
    if (error) return apiError(error.message);
  }

  return apiSuccess({ ok: true });
}

export async function DELETE() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { error } = await db
    .from("notifications")
    .delete()
    .eq("user_id", ctx.userId);

  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
