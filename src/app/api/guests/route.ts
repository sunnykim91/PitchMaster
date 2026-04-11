import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("match_guests")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });
  if (error) return apiError(error.message);
  return apiSuccess({ guests: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("match_guests")
    .insert({
      match_id: body.matchId,
      name: body.name,
      position: body.position || null,
      phone: body.phone || null,
      note: body.note || null,
    })
    .select()
    .single();
  if (error) return apiError(error.message);
  return apiSuccess(data, 201);
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  if (!body.id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 용병이 이 팀의 경기에 속하는지 검증
  const { data: check } = await db
    .from("match_guests")
    .select("id, matches!inner(team_id)")
    .eq("id", body.id)
    .eq("matches.team_id", ctx.teamId)
    .single();
  if (!check) return apiError("Guest not found", 404);

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.position !== undefined) updates.position = body.position || null;
  if (body.phone !== undefined) updates.phone = body.phone || null;
  if (body.note !== undefined) updates.note = body.note || null;

  const { data, error } = await db
    .from("match_guests")
    .update(updates)
    .eq("id", body.id)
    .select()
    .single();
  if (error) return apiError(error.message);
  return apiSuccess(data);
}

export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { error } = await db
    .from("match_guests")
    .delete()
    .eq("id", id);
  if (error) return apiError(error.message);
  return apiSuccess({ deleted: true });
}
