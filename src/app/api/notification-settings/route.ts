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
  // 행이 없으면 null 반환 — 클라이언트가 '실제 구독 여부'로 토글 상태를 판단한다.
  // (과거 { push: true } 기본값은 구독이 없어도 토글을 켜진 것처럼 보이게 해 오해를 유발)
  return apiSuccess({ settings: data ?? null });
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
