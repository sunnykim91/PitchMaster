import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

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

  if (body.markAllRead) {
    const { error } = await db
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", ctx.userId);
    if (error) return apiError(error.message);
  } else if (body.id) {
    const { error } = await db
      .from("notifications")
      .update({ is_read: body.isRead ?? true })
      .eq("id", body.id);
    if (error) return apiError(error.message);
  }

  return apiSuccess({ ok: true });
}
