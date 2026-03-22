import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("notification_settings")
    .select("*")
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (error) return apiError(error.message);
  return apiSuccess({ settings: data || { push: true } });
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // upsert 대신 select → insert/update로 처리 (unique constraint 이슈 방지)
  const { data: existing } = await db
    .from("notification_settings")
    .select("id")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  let data, error;
  if (existing) {
    ({ data, error } = await db
      .from("notification_settings")
      .update({ push: body.push ?? true })
      .eq("user_id", ctx.userId)
      .select()
      .single());
  } else {
    ({ data, error } = await db
      .from("notification_settings")
      .insert({ user_id: ctx.userId, push: body.push ?? true })
      .select()
      .single());
  }

  if (error) return apiError(error.message);
  return apiSuccess({ settings: data });
}
