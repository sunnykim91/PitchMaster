import { NextRequest, NextResponse } from "next/server";
import { getApiContext, requireRole, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { sendTeamPush } from "@/lib/server/sendPush";
import { autoCompleteTeamMatches } from "@/lib/server/autoCompleteMatches";
import { invalidateTeamStats } from "@/lib/server/aiTeamStats";

/** datetime-local 값("2026-04-02T17:00")에 KST 오프셋이 없으면 붙여줌 */
function toKSTTimestamp(v: string): string {
  if (!v) return v;
  // 이미 타임존 정보가 있으면 그대로
  if (/[+-]\d{2}:\d{2}$/.test(v) || v.endsWith("Z")) return v;
  return v + "+09:00";
}

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 종료된 SCHEDULED 경기 → 자동 COMPLETED 처리 (KST 기준, 당일 match_end_time 포함)
  await autoCompleteTeamMatches(db, ctx.teamId);

  const { data, error } = await db
    .from("matches")
    .select("*")
    .eq("team_id", ctx.teamId)
    .order("match_date", { ascending: false });

  if (error) return apiError(error.message);

  // 완료된 경기의 스코어 계산
  type MatchRow = { id: string; status: string; [key: string]: unknown };
  const rows = (data ?? []) as MatchRow[];
  const completedIds = rows.filter((m) => m.status === "COMPLETED").map((m) => m.id);
  let scoreMap: Record<string, string> = {};
  if (completedIds.length > 0) {
    const { data: goals } = await db.from("match_goals").select("match_id, scorer_id, is_own_goal, side").in("match_id", completedIds);
    const internalIds = new Set(rows.filter((m) => m.match_type === "INTERNAL").map((m) => m.id));
    const map: Record<string, string> = {};
    for (const matchId of completedIds) {
      const matchGoals = (goals ?? []).filter((g) => g.match_id === matchId);
      if (internalIds.has(matchId)) {
        // 자체전: A팀 vs B팀 스코어
        const a = matchGoals.filter((g) => g.side === "A").length;
        const b = matchGoals.filter((g) => g.side === "B").length;
        map[matchId] = `${a} : ${b}`;
      } else {
        // 일반 경기: 우리팀 vs 상대팀
        let our = 0, opp = 0;
        for (const g of matchGoals) {
          if (g.scorer_id === "OPPONENT" || g.is_own_goal) opp++;
          else our++;
        }
        map[matchId] = `${our} : ${opp}`;
      }
    }
    scoreMap = map;
  }

  const matches = rows.map((m) => ({
    ...m,
    score: scoreMap[m.id] ?? null,
  }));

  return apiSuccess({ matches });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_CREATE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 팀 기본 참가 인원 상속 (body.playerCount 없을 때만)
  let resolvedPlayerCount = body.playerCount;
  if (resolvedPlayerCount == null) {
    const { data: team } = await db
      .from("teams")
      .select("default_player_count")
      .eq("id", ctx.teamId)
      .single();
    resolvedPlayerCount = team?.default_player_count ?? 11;
  }

  // 날짜·시간 형식 검증
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return apiError("경기 날짜 형식이 올바르지 않습니다");
  }
  // HH:MM 또는 HH:MM:SS 모두 허용 (PG TIME 타입은 HH:MM:SS로 반환)
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
  if (body.time && !timeRegex.test(body.time)) {
    return apiError("경기 시간 형식이 올바르지 않습니다 (예: 14:30)");
  }
  if (body.endTime && !timeRegex.test(body.endTime)) {
    return apiError("종료 시간 형식이 올바르지 않습니다");
  }
  if (body.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.endDate)) {
    return apiError("종료 날짜 형식이 올바르지 않습니다");
  }
  // 시간·날짜 순서 검증
  if (body.endDate && body.endDate < body.date) {
    return apiError("종료 날짜는 시작 날짜보다 뒤여야 합니다");
  }
  // 같은 날이면 시간 비교 (복수일 이벤트 제외)
  if (body.time && body.endTime && (!body.endDate || body.endDate === body.date)) {
    if (body.endTime <= body.time) {
      return apiError("종료 시간은 시작 시간보다 뒤여야 합니다");
    }
  }

  const { data, error } = await db
    .from("matches")
    .insert({
      team_id: ctx.teamId,
      season_id: body.seasonId || null,
      opponent_name: body.opponent || null,
      match_date: body.date,
      match_time: body.time || null,
      match_end_time: body.endTime || null,
      match_end_date: body.endDate || null,
      location: body.location || null,
      quarter_count: body.quarterCount ?? 4,
      quarter_duration: body.quarterDuration ?? 25,
      break_duration: body.breakDuration ?? 5,
      player_count: resolvedPlayerCount,
      uniform_type: body.uniformType ?? "HOME",
      match_type: body.matchType ?? "REGULAR",
      stats_included: body.matchType === "EVENT" ? false : (body.statsIncluded ?? true),
      status: "SCHEDULED",
      vote_deadline: body.voteDeadline ? toKSTTimestamp(body.voteDeadline) : null,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) return apiError(error.message);

  // 경기 등록 알림 발송 (비동기, 응답 차단 안 함)
  const matchDate = body.date;
  const isEvent = body.matchType === "EVENT";
  const isInternal = body.matchType === "INTERNAL";
  const pushTitle = isEvent ? "📅 새 팀 일정이 등록되었습니다" : "새 경기 일정이 등록되었습니다";
  const pushBody = isEvent ? `${matchDate} ${body.opponent || "팀 일정"}`
    : isInternal ? `${matchDate} 자체전`
    : `${matchDate} vs ${body.opponent || "상대 미정"}`;
  sendTeamPush(ctx.teamId!, {
    title: pushTitle,
    body: pushBody,
    url: `/matches/${data.id}?tab=info`,
  }).catch(() => {});

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

  // 날짜·시간 형식·순서 검증 (HH:MM 또는 HH:MM:SS 허용)
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (body.date !== undefined && body.date && !dateRegex.test(body.date)) {
    return apiError("경기 날짜 형식이 올바르지 않습니다");
  }
  if (body.time && !timeRegex.test(body.time)) return apiError("경기 시간 형식이 올바르지 않습니다");
  if (body.endTime && !timeRegex.test(body.endTime)) return apiError("종료 시간 형식이 올바르지 않습니다");
  if (body.endDate && !dateRegex.test(body.endDate)) return apiError("종료 날짜 형식이 올바르지 않습니다");
  if (body.date && body.endDate && body.endDate < body.date) {
    return apiError("종료 날짜는 시작 날짜보다 뒤여야 합니다");
  }
  if (body.time && body.endTime && (!body.endDate || body.endDate === body.date)) {
    if (body.endTime <= body.time) {
      return apiError("종료 시간은 시작 시간보다 뒤여야 합니다");
    }
  }
  // 상태 머신 역행 차단: COMPLETED → SCHEDULED 금지
  if (body.status === "SCHEDULED") {
    const { data: current } = await db.from("matches").select("status").eq("id", body.id).eq("team_id", ctx.teamId).single();
    if (current?.status === "COMPLETED") {
      return apiError("완료된 경기는 예정 상태로 되돌릴 수 없습니다");
    }
  }

  const updates: Record<string, unknown> = {};
  if (body.date !== undefined) updates.match_date = body.date;
  if (body.time !== undefined) updates.match_time = body.time || null;
  if (body.endTime !== undefined) updates.match_end_time = body.endTime || null;
  if (body.endDate !== undefined) updates.match_end_date = body.endDate || null;
  if (body.location !== undefined) updates.location = body.location || null;
  if (body.opponent !== undefined) updates.opponent_name = body.opponent || null;
  if (body.quarterCount !== undefined) updates.quarter_count = body.quarterCount;
  if (body.quarterDuration !== undefined) updates.quarter_duration = body.quarterDuration;
  if (body.breakDuration !== undefined) updates.break_duration = body.breakDuration;
  if (body.playerCount !== undefined) updates.player_count = body.playerCount;
  if (body.status !== undefined) updates.status = body.status;
  if (body.voteDeadline !== undefined) updates.vote_deadline = body.voteDeadline ? toKSTTimestamp(body.voteDeadline) : null;
  if (body.uniformType !== undefined) updates.uniform_type = body.uniformType;
  if (body.matchType !== undefined) updates.match_type = body.matchType;
  if (body.statsIncluded !== undefined) updates.stats_included = body.statsIncluded;

  // 상태 전환 직전 조회 (SCHEDULED → COMPLETED 감지용)
  const prevStatus = body.status !== undefined
    ? (await db.from("matches").select("status").eq("id", body.id).eq("team_id", ctx.teamId).single()).data?.status
    : null;

  const { data, error } = await db
    .from("matches")
    .update(updates)
    .eq("id", body.id)
    .eq("team_id", ctx.teamId)
    .select()
    .single();

  if (error) return apiError(error.message);

  // 수동 COMPLETED 전환 시 시그니처 invalidate (백그라운드)
  if (body.status === "COMPLETED" && prevStatus !== "COMPLETED") {
    const { invalidateSignaturesForMatch } = await import("@/lib/server/aiSignatureInvalidate");
    invalidateSignaturesForMatch(db, body.id).catch(() => {});
  }

  // AI 팀스탯 캐시 무효화 (over-invalidation 허용 — 다음 AI 호출 시 재계산)
  invalidateTeamStats(ctx.teamId).catch(() => {});

  return apiSuccess(data);
}

export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_DELETE);
  if (roleCheck) return roleCheck;

  const body = await request.json();
  if (!body.id) return apiError("id required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // DB FK CASCADE로 관련 데이터(goals, mvp, attendance, squad, diary, guests) 자동 삭제
  const { error } = await db
    .from("matches")
    .delete()
    .eq("id", body.id)
    .eq("team_id", ctx.teamId);

  if (error) return apiError(error.message);
  return apiSuccess({ ok: true });
}
