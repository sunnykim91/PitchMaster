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

  // select("*") intentional: all diary columns (weather, condition, memo, photos) returned to client
  const { data, error } = await db
    .from("match_diaries")
    .select("*")
    .eq("match_id", matchId)
    .maybeSingle();
  if (error) return apiError(error.message);
  return apiSuccess({ diary: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("match_diaries")
    .upsert(
      {
        match_id: body.matchId,
        weather: body.weather || null,
        condition: body.condition || null,
        memo: body.memo || null,
        photos: body.photos || [],
        created_by: ctx.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "match_id" }
    )
    .select()
    .single();
  if (error) return apiError(error.message);
  return apiSuccess(data, 201);
}
