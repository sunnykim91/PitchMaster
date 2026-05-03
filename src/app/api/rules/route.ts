import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { validateFreeText } from "@/lib/validators/safeText";

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

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
  const titleCheck = validateFreeText(body.title, { maxLength: 200, fieldLabel: "제목" });
  if (!titleCheck.ok) return apiError(titleCheck.reason);
  const contentCheck = validateFreeText(body.content, { maxLength: 20000, fieldLabel: "내용" });
  if (!contentCheck.ok) return apiError(contentCheck.reason);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const now = new Date().toISOString();
  const { data, error } = await db
    .from("rules")
    .insert({
      team_id: ctx.teamId,
      title: titleCheck.value,
      content: contentCheck.value,
      category: body.category || "일반",
      file_url: body.fileUrl || null,
      file_name: body.fileName || null,
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
  const titleCheck = validateFreeText(body.title, { maxLength: 200, fieldLabel: "제목" });
  if (!titleCheck.ok) return apiError(titleCheck.reason);
  const contentCheck = validateFreeText(body.content, { maxLength: 20000, fieldLabel: "내용" });
  if (!contentCheck.ok) return apiError(contentCheck.reason);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("rules")
    .update({
      title: titleCheck.value,
      content: contentCheck.value,
      category: body.category,
      file_url: body.fileUrl ?? null,
      file_name: body.fileName ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id)
    .eq("team_id", ctx.teamId)
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data);
}

export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.RULE_EDIT);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  if (!body.id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { error } = await db
    .from("rules")
    .delete()
    .eq("id", body.id)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
