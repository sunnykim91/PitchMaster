import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, "STAFF");
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const { matchId, userId, attended } = body;
  if (!matchId || !userId) return apiError("matchId and userId required");

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ ok: true, demo: true });

  // Upsert attendance with actually_attended
  const { error } = await db.from("match_attendance").upsert(
    {
      match_id: matchId,
      user_id: userId,
      vote: "ATTEND",
      actually_attended: attended ?? true,
      voted_at: new Date().toISOString(),
    },
    { onConflict: "match_id,user_id" }
  );

  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ attendance: [], demo: true });

  const { data, error } = await db
    .from("match_attendance")
    .select("*, users(id, name)")
    .eq("match_id", matchId)
    .not("actually_attended", "is", null);

  if (error) return apiError(error.message);
  return apiSuccess({ attendance: data });
}
