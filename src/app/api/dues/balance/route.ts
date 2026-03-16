import { NextRequest, NextResponse } from "next/server";
import { getApiContext, requireRole, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

/** GET: 현재 팀의 실제 통장 잔고 조회 */
export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("teams")
    .select("actual_balance, balance_updated_at")
    .eq("id", ctx.teamId)
    .single();

  if (error) return apiError(error.message);
  return apiSuccess({
    balance: data?.actual_balance ?? null,
    updatedAt: data?.balance_updated_at ?? null,
  });
}

/** POST: 실제 통장 잔고 업데이트 (운영진 이상) */
export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.DUES_RECORD_ADD);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const { balance } = body;
  if (typeof balance !== "number") return apiError("balance (number) required", 400);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { error } = await db
    .from("teams")
    .update({
      actual_balance: balance,
      balance_updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ balance, updatedAt: new Date().toISOString() });
}
