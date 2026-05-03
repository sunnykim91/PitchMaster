import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess, requireRole } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { validateFreeText } from "@/lib/validators/safeText";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data: matchCheck } = await db
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!matchCheck) return apiError("Match not found", 404);

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

  // 경기 일지 작성·수정은 운영진(STAFF+) 만 가능
  const roleError = requireRole(ctx, "STAFF");
  if (roleError) return roleError;

  const body = await request.json();
  if (!body.matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data: matchCheck } = await db
    .from("matches")
    .select("id")
    .eq("id", body.matchId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!matchCheck) return apiError("Match not found", 404);

  // memo는 자유 텍스트 — 검증 (빈 문자열도 허용해야 하므로 falsy 직접 처리)
  let memoValue: string | null = null;
  if (typeof body.memo === "string" && body.memo.trim().length > 0) {
    const memoCheck = validateFreeText(body.memo, { maxLength: 5000, fieldLabel: "메모" });
    if (!memoCheck.ok) return apiError(memoCheck.reason);
    memoValue = memoCheck.value;
  }

  const { data, error } = await db
    .from("match_diaries")
    .upsert(
      {
        match_id: body.matchId,
        weather: body.weather || null,
        condition: body.condition || null,
        memo: memoValue,
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
