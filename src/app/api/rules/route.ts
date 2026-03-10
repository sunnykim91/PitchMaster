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
  if (!db) return apiSuccess({ rules: [], demo: true });

  const { data, error } = await db
    .from("rules")
    .select("*, creator:created_by(name)")
    .eq("team_id", ctx.teamId)
    .order("updated_at", { ascending: false });

  if (error) return apiError(error.message);
  return apiSuccess({ rules: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.RULE_CREATE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ id: "demo", demo: true }, 201);

  const now = new Date().toISOString();
  const { data, error } = await db
    .from("rules")
    .insert({
      team_id: ctx.teamId,
      title: body.title,
      content: body.content,
      category: body.category || "일반",
      created_by: ctx.userId,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data, 201);
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.RULE_EDIT);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  if (!body.id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ ok: true, demo: true });

  const { data, error } = await db
    .from("rules")
    .update({
      title: body.title,
      content: body.content,
      category: body.category,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data);
}
