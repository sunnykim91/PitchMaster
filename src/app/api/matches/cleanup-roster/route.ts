import { NextRequest, NextResponse } from "next/server";
import { getApiContext, requireRole, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { scrubAbsentFromPositions, type SquadPosition } from "@/lib/server/squadCleanup";

/**
 * 빠진 인원 정리 — 더 이상 참석하지 않는 인원(삭제된 용병·참석→불참 전환 회원)을
 * 자체전 팀 편성(match_internal_teams)과 전술판 배치(match_squads)에서 한 번에 제거.
 *
 * 클라이언트가 현재 유효한(참석 중인) 인원 id 전부(validIds)를 보내면,
 * 그 집합에 없는 player_id 만 골라 제거한다. (STAFF 전용 · 경기 소유 검증)
 */
export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_EDIT);
  if (roleCheck) return roleCheck;

  const { matchId, validIds } = await request.json();
  if (!matchId || !Array.isArray(validIds)) return apiError("matchId and validIds required");

  const validSet = new Set((validIds as unknown[]).filter((x): x is string => typeof x === "string"));
  // 안전장치: 빈 명단으로 전체 삭제 방지 (참석자 로딩 중 오발사 차단)
  if (validSet.size === 0) {
    return apiError("참석 인원을 불러오는 중이에요. 잠시 후 다시 시도해주세요.");
  }

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data: match } = await db
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();
  if (!match) return apiError("Match not found", 404);

  // 1) 자체전 팀 편성에서 빠진 인원 제거
  const { data: teamRows } = await db
    .from("match_internal_teams")
    .select("id, player_id")
    .eq("match_id", matchId);
  const ghostTeamIds = (teamRows ?? [])
    .filter((r) => !validSet.has(r.player_id))
    .map((r) => r.id);
  let removedTeams = 0;
  if (ghostTeamIds.length > 0) {
    const { error } = await db.from("match_internal_teams").delete().in("id", ghostTeamIds);
    if (error) return apiError(error.message);
    removedTeams = ghostTeamIds.length;
  }

  // 2) 전술판 배치에서 빠진 인원 제거 (메타 슬롯 제외)
  const { data: squads } = await db
    .from("match_squads")
    .select("id, positions")
    .eq("match_id", matchId);
  let removedSlots = 0;
  for (const sq of squads ?? []) {
    const { positions, removed } = scrubAbsentFromPositions(
      (sq.positions ?? {}) as Record<string, SquadPosition>,
      validSet,
    );
    if (removed > 0) {
      const { error } = await db.from("match_squads").update({ positions }).eq("id", sq.id);
      if (!error) removedSlots += removed;
    }
  }

  return apiSuccess({ removedTeams, removedSlots });
}
