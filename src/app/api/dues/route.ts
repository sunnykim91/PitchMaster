import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const memberId = request.nextUrl.searchParams.get("memberId");
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  let query = db
    .from("dues_records")
    .select("*, users:user_id(name), recorder:recorded_by(name)")
    .eq("team_id", ctx.teamId)
    .order("recorded_at", { ascending: false });

  if (memberId) {
    query = query.eq("user_id", memberId);
  }

  const { data, error } = await query;
  if (error) return apiError(error.message);
  return apiSuccess({ records: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.DUES_RECORD_ADD);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 중복 체크: 같은 날짜 + 금액 + 설명 + 구분이 이미 있으면 스킵
  if (body.recordedAt && body.description && body.amount) {
    const { data: existing } = await db
      .from("dues_records")
      .select("id")
      .eq("team_id", ctx.teamId)
      .eq("type", body.type)
      .eq("amount", body.amount)
      .eq("description", body.description)
      .gte("recorded_at", `${body.recordedAt}T00:00:00`)
      .lte("recorded_at", `${body.recordedAt}T23:59:59`)
      .limit(1);
    if (existing && existing.length > 0) {
      return apiSuccess({ duplicate: true, id: existing[0].id });
    }
  }

  const { data, error } = await db
    .from("dues_records")
    .insert({
      team_id: ctx.teamId,
      user_id: body.userId || null,
      type: body.type,
      amount: body.amount,
      description: body.description || null,
      screenshot_url: body.screenshotUrl || null,
      recorded_by: ctx.userId,
      recorded_at: body.recordedAt ? `${body.recordedAt}T${body.recordedTime || "00:00"}:00` : new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data, 201);
}
