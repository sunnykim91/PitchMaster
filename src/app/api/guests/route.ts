import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess, requireRole } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { validateSafeName } from "@/lib/validators/safeText";
import { removePlayerFromPositions, type SquadPosition } from "@/lib/server/squadCleanup";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) return apiError("matchId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 경기가 현재 팀 소속인지 검증
  const { data: matchCheck } = await db
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!matchCheck) return apiError("Match not found", 404);

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

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_EDIT);
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

  // 용병 이름 필수·안전성 검증 (빈/null 이름·인젝션 차단)
  const nameCheck = validateSafeName(body.name, { maxLength: 20, fieldLabel: "용병 이름", requireMeaningful: true });
  if (!nameCheck.ok) return apiError(nameCheck.reason);

  const { data, error } = await db
    .from("match_guests")
    .insert({
      match_id: body.matchId,
      name: nameCheck.value,
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

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_EDIT);
  if (roleCheck) return roleCheck;

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
  if (body.name !== undefined) {
    const nameCheck = validateSafeName(body.name, { maxLength: 20, fieldLabel: "용병 이름", requireMeaningful: true });
    if (!nameCheck.ok) return apiError(nameCheck.reason);
    updates.name = nameCheck.value;
  }
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

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_EDIT);
  if (roleCheck) return roleCheck;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 용병이 이 팀의 경기에 속하는지 검증 (match_id 도 가져와 정리 범위 한정)
  const { data: check } = await db
    .from("match_guests")
    .select("id, match_id, matches!inner(team_id)")
    .eq("id", id)
    .eq("matches.team_id", ctx.teamId)
    .single();
  if (!check) return apiError("Guest not found", 404);

  const { error } = await db
    .from("match_guests")
    .delete()
    .eq("id", id);
  if (error) return apiError(error.message);

  // 자체전 팀 편성·전술판 배치에서도 함께 제거 (유령 인원수·"알 수 없음" 슬롯 방지).
  // best-effort — 정리 실패가 용병 삭제 자체를 되돌리지 않도록 try/catch.
  try {
    await db
      .from("match_internal_teams")
      .delete()
      .eq("match_id", check.match_id)
      .eq("player_id", id);

    const { data: squads } = await db
      .from("match_squads")
      .select("id, positions")
      .eq("match_id", check.match_id);
    for (const sq of squads ?? []) {
      const { positions, removed } = removePlayerFromPositions(
        (sq.positions ?? {}) as Record<string, SquadPosition>,
        id,
      );
      if (removed > 0) {
        await db.from("match_squads").update({ positions }).eq("id", sq.id);
      }
    }
  } catch {
    /* best-effort cleanup */
  }

  return apiSuccess({ deleted: true });
}
