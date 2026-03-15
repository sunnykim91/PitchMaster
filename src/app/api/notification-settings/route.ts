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
  return apiSuccess({ settings: data || { email: true, push: true } });
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("notification_settings")
    .upsert(
      {
        user_id: ctx.userId,
        email: body.email ?? true,
        push: body.push ?? true,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();
  if (error) return apiError(error.message);
  return apiSuccess({ settings: data });
}
