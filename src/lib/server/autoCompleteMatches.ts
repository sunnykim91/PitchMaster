import type { SupabaseClient } from "@supabase/supabase-js";
import { invalidateSignaturesForMatches } from "@/lib/server/aiSignatureInvalidate";
import { processMatchCompletedPush } from "@/lib/server/processMatchCompletedPush";
import { invalidateTeamStats } from "@/lib/server/aiTeamStats";

/**
 * KST 기준 현재 시각 계산.
 * 서버가 어떤 타임존에서 돌든 KST(UTC+9)의 "오늘" 과 "지금"을 얻기 위한 유틸.
 */
export function getKstNow(nowMs: number = Date.now()): Date {
  return new Date(nowMs + 9 * 60 * 60 * 1000);
}

/** 'YYYY-MM-DD' 형식의 KST 오늘 날짜 */
export function getKstToday(nowMs: number = Date.now()): string {
  return getKstNow(nowMs).toISOString().split("T")[0];
}

/** 'HH:MM:SS' 형식의 KST 현재 시각 */
export function getKstTimeOfDay(nowMs: number = Date.now()): string {
  return getKstNow(nowMs).toISOString().split("T")[1].slice(0, 8);
}

/**
 * 자동 완료 판정 — 주어진 경기 한 건이 "이미 끝난 경기" 인지 KST 기준으로 판단.
 *
 * 정책:
 * 1) match_end_date 가 있으면 그 날짜 기준. 지났으면 완료.
 * 2) match_date 가 오늘 이전이면 완료 (시간 무관).
 * 3) match_date 가 오늘이면 match_end_time 이 있는 경우 그 시각이 지났으면 완료.
 *    match_end_time 이 없으면 당일 중에는 완료로 치지 않음 (기존 동작 보존).
 * 4) match_date 가 미래면 절대 완료가 아님.
 */
export function shouldAutoComplete(
  match: {
    status: string;
    match_date: string;
    match_time?: string | null;
    match_end_date?: string | null;
    match_end_time?: string | null;
  },
  nowMs: number = Date.now()
): boolean {
  if (match.status !== "SCHEDULED") return false;

  const today = getKstToday(nowMs);
  const nowTime = getKstTimeOfDay(nowMs);

  // 복수일(event 등) — match_end_date 가 지났으면 완료
  if (match.match_end_date) {
    return match.match_end_date < today;
  }

  // 날짜가 과거
  if (match.match_date < today) return true;

  // 미래
  if (match.match_date > today) return false;

  // 당일 경기 — 종료 시각이 있는 경우에만 시간 비교
  if (match.match_end_time) {
    return match.match_end_time <= nowTime;
  }

  return false;
}

/**
 * DB 업데이트 헬퍼 — 팀의 SCHEDULED 경기 중 자동 완료 대상인 것들을
 * 2개의 UPDATE 로 나눠서 COMPLETED 로 전환.
 *
 * 1) 어제 이전 경기: 단순 .lt("match_date", today) 업데이트
 * 2) 당일 경기: 종료 시각이 지난 것만 선별 업데이트
 *
 * Supabase PostgREST 의 복합 조건 한계로 2번 분리. 트랜잭션은 아니지만
 * 읽기 일관성이 요구되는 연산이 아니라 레이스 컨디션 영향 없음.
 */
export async function autoCompleteTeamMatches(
  db: SupabaseClient,
  teamId: string,
  nowMs: number = Date.now()
): Promise<void> {
  const today = getKstToday(nowMs);
  const nowTime = getKstTimeOfDay(nowMs);
  const completedIds: string[] = [];

  // 1·2) 두 UPDATE 는 독립적이라 병렬 실행 (이전 직렬 → ~30ms 절감)
  const [past, todayEnded] = await Promise.all([
    db
      .from("matches")
      .update({ status: "COMPLETED" })
      .eq("team_id", teamId)
      .eq("status", "SCHEDULED")
      .lt("match_date", today)
      .select("id"),
    db
      .from("matches")
      .update({ status: "COMPLETED" })
      .eq("team_id", teamId)
      .eq("status", "SCHEDULED")
      .eq("match_date", today)
      .not("match_end_time", "is", null)
      .lte("match_end_time", nowTime)
      .select("id"),
  ]);
  if (Array.isArray(past.data)) completedIds.push(...past.data.map((m) => m.id));
  if (Array.isArray(todayEnded.data)) completedIds.push(...todayEnded.data.map((m) => m.id));

  // 3) 완료된 경기들의 참석자 시그니처 stale 처리 (신 스탯 반영, 백그라운드)
  if (completedIds.length > 0) {
    invalidateSignaturesForMatches(db, completedIds).catch(() => {});

    // 4) MVP 투표 시작 + OVR 변동 푸시 (fire-and-forget — 페이지 로드 즉시 반응)
    //    crons 도 안전망으로 돌지만, 경기 종료 직후 누군가 페이지 열면 여기서 먼저 나감.
    processMatchCompletedPush(db, completedIds).catch(() => {});

    // 5) AI 팀 스탯 캐시 무효화 — COMPLETED 전환은 통계 집계에 직접 영향
    invalidateTeamStats(teamId).catch(() => {});
  }
}
