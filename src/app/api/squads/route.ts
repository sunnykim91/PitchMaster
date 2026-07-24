import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { invalidateTeamStats } from "@/lib/server/aiTeamStats";

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

  const side = request.nextUrl.searchParams.get("side");

  let query = db
    .from("match_squads")
    .select("*")
    .eq("match_id", matchId);

  if (side) {
    query = query.eq("side", side);
  } else {
    query = query.is("side", null);
  }

  const { data, error } = await query.order("quarter_number");

  if (error) return apiError(error.message);
  return apiSuccess({ squads: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.SQUAD_EDIT);
  if (roleCheck) return roleCheck;

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

  const side = body.side ?? null;
  const payload = {
    match_id: body.matchId,
    quarter_number: body.quarterNumber,
    formation: body.formation,
    positions: body.positions,
    // 쿼터별 세트피스 키커 { fk, ck_left, ck_right, pk } — 미전달(undefined) 시 null 로 초기화
    set_pieces: body.setPieces ?? null,
    side,
  };

  // Race-safe upsert (delete+insert 패턴은 두 명이 동시에 자동편성 누르면 한쪽 작업 손실 위험).
  // match_attendance 의 검증된 패턴(00003) 따라:
  //   1) 기존 row 조회 → 있으면 UPDATE, 없으면 INSERT
  //   2) INSERT 시 UNIQUE 위반(23505) → 그새 다른 요청이 INSERT 한 것 → 다시 조회 후 UPDATE
  // partial unique index 가 NULL/NOT NULL 케이스 모두 보호. last-writer-wins 시맨틱.
  const findQuery = side
    ? db.from("match_squads").select("id").eq("match_id", body.matchId).eq("quarter_number", body.quarterNumber).eq("side", side)
    : db.from("match_squads").select("id").eq("match_id", body.matchId).eq("quarter_number", body.quarterNumber).is("side", null);

  const { data: existing } = await findQuery.maybeSingle();

  let data: unknown;
  let error: { code?: string; message?: string } | null = null;

  if (existing) {
    ({ data, error } = await db.from("match_squads").update(payload).eq("id", existing.id).select().single());
  } else {
    ({ data, error } = await db.from("match_squads").insert(payload).select().single());
    // INSERT 직후 race로 UNIQUE 위반 → 동시 다른 요청이 INSERT 한 것. 우리는 UPDATE 로 가야 함.
    if (error && (error.code === "23505" || (error.message?.includes("duplicate") ?? false))) {
      const recheck = side
        ? db.from("match_squads").select("id").eq("match_id", body.matchId).eq("quarter_number", body.quarterNumber).eq("side", side)
        : db.from("match_squads").select("id").eq("match_id", body.matchId).eq("quarter_number", body.quarterNumber).is("side", null);
      const { data: raced } = await recheck.maybeSingle();
      if (raced) {
        ({ data, error } = await db.from("match_squads").update(payload).eq("id", raced.id).select().single());
      }
    }
  }

  if (error) return apiError(error.message ?? "편성 저장 실패");
  invalidateTeamStats(ctx.teamId).catch(() => {});
  return apiSuccess(data);
}
