import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ settings: [], demo: true });

  const { data, error } = await db
    .from("dues_settings")
    .select("*")
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ settings: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.DUES_SETTING_EDIT);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ id: "demo", demo: true }, 201);

  const { data, error } = await db
    .from("dues_settings")
    .insert({
      team_id: ctx.teamId,
      member_type: body.memberType,
      monthly_amount: body.monthlyAmount,
      description: body.description || null,
    })
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data, 201);
}
