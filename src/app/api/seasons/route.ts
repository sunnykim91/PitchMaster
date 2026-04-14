import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

const SEASON_DELETE_ROLE = PERMISSIONS.SEASON_CREATE; // STAFF+

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // select("*") intentional: all season columns are returned to the client
  const { data, error } = await db
    .from("seasons")
    .select("*")
    .eq("team_id", ctx.teamId)
    .order("start_date", { ascending: false });

  if (error) return apiError(error.message);
  return apiSuccess({ seasons: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.SEASON_CREATE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return apiError("시즌 이름을 입력해주세요");
  if (name.length > 100) return apiError("시즌 이름은 100자 이하로 입력해주세요");
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!body.startDate || !dateRegex.test(body.startDate)) return apiError("시작일 형식이 올바르지 않습니다");
  if (!body.endDate || !dateRegex.test(body.endDate)) return apiError("종료일 형식이 올바르지 않습니다");
  if (body.startDate > body.endDate) return apiError("시작일은 종료일보다 앞서야 합니다");

  // If marking as active, deactivate others first
  if (body.isActive) {
    await db
      .from("seasons")
      .update({ is_active: false })
      .eq("team_id", ctx.teamId);
  }

  const { data, error } = await db
    .from("seasons")
    .insert({
      team_id: ctx.teamId,
      name,
      start_date: body.startDate,
      end_date: body.endDate,
      is_active: body.isActive ?? false,
    })
    .select()
    .single();

  if (error) return apiError(error.message);
  return apiSuccess(data, 201);
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.SEASON_ACTIVATE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  if (!body.id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // Deactivate all, then activate the selected one
  await db
    .from("seasons")
    .update({ is_active: false })
    .eq("team_id", ctx.teamId);
  const { error } = await db
    .from("seasons")
    .update({ is_active: true })
    .eq("id", body.id)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, SEASON_DELETE_ROLE);
  if (roleCheck) return roleCheck;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // Prevent deleting active season
  const { data: season } = await db
    .from("seasons")
    .select("is_active")
    .eq("id", id)
    .eq("team_id", ctx.teamId)
    .single();

  if (!season) return apiError("Season not found", 404);
  if (season.is_active) return apiError("활성 시즌은 삭제할 수 없습니다", 400);

  const { error } = await db
    .from("seasons")
    .delete()
    .eq("id", id)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
