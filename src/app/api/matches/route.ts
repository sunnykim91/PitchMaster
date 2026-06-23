import { NextRequest, NextResponse } from "next/server";
import { getApiContext, requireRole, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { sendTeamPush } from "@/lib/server/sendPush";
import { autoCompleteTeamMatches, shouldAutoComplete } from "@/lib/server/autoCompleteMatches";
import { invalidateTeamStats } from "@/lib/server/aiTeamStats";
import { validateFreeText } from "@/lib/validators/safeText";

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

  // 자동 완료 UPDATE 를 await 로 막지 않고 SELECT 와 병렬 실행(순차 1라운드트립 절감) +
  // shouldAutoComplete in-memory 보정 — UPDATE 가 SELECT 보다 늦게 끝나도 응답엔 완료로 반영.
  const [, matchesRes] = await Promise.all([
    autoCompleteTeamMatches(db, ctx.teamId),
    db.from("matches").select("*").eq("team_id", ctx.teamId).order("match_date", { ascending: false }),
  ]);
  const { data, error } = matchesRes;
  if (error) return apiError(error.message);

  // 완료된 경기의 스코어 계산
  type MatchRow = {
    id: string;
    status: string;
    match_date: string;
    match_time?: string | null;
    match_end_date?: string | null;
    match_end_time?: string | null;
    match_type?: string | null;
    [key: string]: unknown;
  };
  const rows = ((data ?? []) as MatchRow[]).map((m) =>
    shouldAutoComplete(m) ? { ...m, status: "COMPLETED" } : m
  );
  const completedIds = rows.filter((m) => m.status === "COMPLETED").map((m) => m.id);
  let scoreMap: Record<string, string> = {};
  if (completedIds.length > 0) {
    const { data: goals } = await db.from("match_goals").select("match_id, scorer_id, is_own_goal, side").in("match_id", completedIds);
    const internalIds = new Set(rows.filter((m) => m.match_type === "INTERNAL").map((m) => m.id));
    // 경기별 골 1회 그룹핑 — 기존의 경기마다 goals.filter() (O(경기×골)) 제거
    const goalsByMatch = new Map<string, Array<{ scorer_id: string; is_own_goal: boolean; side: string | null }>>();
    for (const g of (goals ?? []) as Array<{ match_id: string; scorer_id: string; is_own_goal: boolean; side: string | null }>) {
      let arr = goalsByMatch.get(g.match_id);
      if (!arr) { arr = []; goalsByMatch.set(g.match_id, arr); }
      arr.push(g);
    }
    const map: Record<string, string> = {};
    for (const matchId of completedIds) {
      const matchGoals = goalsByMatch.get(matchId) ?? [];
      if (internalIds.has(matchId)) {
        const hasC = matchGoals.some((g) => g.side === "C");
        if (hasC) {
          // 3파전: 팀별 골 합계 (자책골 개념 미적용 — 넣은 팀에 합산)
          const tally = (side: string) => matchGoals.filter((g) => g.side === side && !g.is_own_goal).length;
          map[matchId] = `${tally("A")} : ${tally("B")} : ${tally("C")}`;
        } else {
          // 자체전 2팀: A팀 vs B팀 (자책골은 side=범한 팀이므로 상대 사이드 득점으로 집계)
          const a = matchGoals.filter((g) => g.side === "A" && !g.is_own_goal).length
            + matchGoals.filter((g) => g.side === "B" && g.is_own_goal).length;
          const b = matchGoals.filter((g) => g.side === "B" && !g.is_own_goal).length
            + matchGoals.filter((g) => g.side === "A" && g.is_own_goal).length;
          map[matchId] = `${a} : ${b}`;
        }
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

  // sport_type 검증 + player_count 일치
  // EVENT는 sport_type 없음, REGULAR/INTERNAL은 SOCCER 또는 FUTSAL
  let resolvedSportType: "SOCCER" | "FUTSAL" | null = null;
  if (body.matchType !== "EVENT") {
    if (body.sportType && !["SOCCER", "FUTSAL"].includes(body.sportType)) {
      return apiError("종목은 SOCCER 또는 FUTSAL만 가능합니다");
    }
    resolvedSportType = body.sportType ?? null; // null이면 팀 sport_type 따라감
    if (resolvedSportType) {
      const validRange =
        resolvedSportType === "FUTSAL"
          ? resolvedPlayerCount >= 3 && resolvedPlayerCount <= 6
          : resolvedPlayerCount >= 8 && resolvedPlayerCount <= 11;
      if (!validRange) {
        const range = resolvedSportType === "FUTSAL" ? "3~6" : "8~11";
        const sportLabel = resolvedSportType === "FUTSAL" ? "풋살" : "축구";
        return apiError(`${sportLabel} 경기의 참가 인원은 ${range}명만 가능합니다`);
      }
    }
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

  if (body.opponent) {
    const oppCheck = validateFreeText(body.opponent, { maxLength: 50, fieldLabel: "상대팀 이름" });
    if (!oppCheck.ok) return apiError(oppCheck.reason);
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
      sport_type: resolvedSportType,
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
  const isFutsalMatch = resolvedSportType === "FUTSAL";
  const sportLabel = isFutsalMatch ? "풋살 " : "";
  const pushTitle = isEvent
    ? "📅 새 팀 일정이 등록되었습니다"
    : `새 ${sportLabel}경기 일정이 등록되었습니다`;
  const pushBody = isEvent ? `${matchDate} ${body.opponent || "팀 일정"}`
    : isInternal ? `${matchDate} ${sportLabel}자체전`
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

  if (body.opponent !== undefined && body.opponent !== null && body.opponent !== "") {
    const oppCheck = validateFreeText(body.opponent, { maxLength: 50, fieldLabel: "상대팀 이름" });
    if (!oppCheck.ok) return apiError(oppCheck.reason);
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
  if (body.matchType !== undefined) {
    if (!["REGULAR", "INTERNAL", "EVENT"].includes(body.matchType)) return apiError("경기 유형이 올바르지 않습니다");
    updates.match_type = body.matchType;
  }
  if (body.statsIncluded !== undefined) updates.stats_included = body.statsIncluded;
  // 자체전 3파전 팀별 승/무/패 수기 카운트 — A/B/C 키 + 음수 아닌 정수만 허용 (JSONB 주입 방지)
  if (body.internalTeamResults !== undefined) {
    const r = body.internalTeamResults;
    if (r !== null && typeof r !== "object") return apiError("internalTeamResults 형식이 올바르지 않습니다");
    const clean: Record<string, { w: number; d: number; l: number }> = {};
    for (const side of ["A", "B", "C"]) {
      const v = r?.[side];
      if (v && typeof v === "object") {
        clean[side] = {
          w: Math.max(0, Math.floor(Number(v.w) || 0)),
          d: Math.max(0, Math.floor(Number(v.d) || 0)),
          l: Math.max(0, Math.floor(Number(v.l) || 0)),
        };
      }
    }
    updates.internal_team_results = Object.keys(clean).length > 0 ? clean : null;
  }
  if (body.sportType !== undefined) {
    if (body.sportType !== null && !["SOCCER", "FUTSAL"].includes(body.sportType)) {
      return apiError("종목은 SOCCER 또는 FUTSAL만 가능합니다");
    }
    updates.sport_type = body.sportType;
  }

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
  invalidateTeamStats(ctx.teamId).catch(() => {});
  return apiSuccess({ ok: true });
}
