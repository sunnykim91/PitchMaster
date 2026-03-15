import { NextRequest, NextResponse } from "next/server";
import { getApiContext, requireRole, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// --- Penalty Rules ---

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const type = request.nextUrl.searchParams.get("type"); // "rules" or "records"
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  if (type === "records") {
    const { data, error } = await db
      .from("penalty_records")
      .select("*, rule:rule_id(name), member:member_id(name), recorder:recorded_by(name)")
      .eq("team_id", ctx.teamId)
      .order("created_at", { ascending: false });
    if (error) return apiError(error.message);
    return apiSuccess({ records: data });
  }

  // Default: return rules
  const { data, error } = await db
    .from("penalty_rules")
    .select("*")
    .eq("team_id", ctx.teamId)
    .order("created_at", { ascending: false });
  if (error) return apiError(error.message);
  return apiSuccess({ rules: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, "STAFF");
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // Determine if creating a rule or a record
  if (body.action === "record") {
    const { data, error } = await db
      .from("penalty_records")
      .insert({
        team_id: ctx.teamId,
        rule_id: body.ruleId || null,
        member_id: body.memberId,
        amount: body.amount,
        date: body.date,
        is_paid: false,
        note: body.note || null,
        recorded_by: ctx.userId,
      })
      .select()
      .single();
    if (error) return apiError(error.message);
    return apiSuccess(data, 201);
  }

  // Create rule
  const { data, error } = await db
    .from("penalty_rules")
    .insert({
      team_id: ctx.teamId,
      name: body.name,
      amount: body.amount,
      description: body.description || null,
    })
    .select()
    .single();
  if (error) return apiError(error.message);
  return apiSuccess(data, 201);
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, "STAFF");
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // Toggle penalty paid status
  const { data, error } = await db
    .from("penalty_records")
    .update({ is_paid: body.isPaid })
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

  const roleCheck = requireRole(ctx, "STAFF");
  if (roleCheck) return roleCheck;

  const id = request.nextUrl.searchParams.get("id");
  const type = request.nextUrl.searchParams.get("type"); // "rule" or "record"
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const table = type === "rule" ? "penalty_rules" : "penalty_records";
  const { error } = await db
    .from(table)
    .delete()
    .eq("id", id)
    .eq("team_id", ctx.teamId);
  if (error) return apiError(error.message);
  return apiSuccess({ deleted: true });
}
