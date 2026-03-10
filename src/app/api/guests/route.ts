import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ guests: [], demo: true });

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
  if (!db) return apiSuccess({ id: "demo", demo: true }, 201);

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

export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ demo: true });

  const { error } = await db
    .from("match_guests")
    .delete()
    .eq("id", id);
  if (error) return apiError(error.message);
  return apiSuccess({ deleted: true });
}
