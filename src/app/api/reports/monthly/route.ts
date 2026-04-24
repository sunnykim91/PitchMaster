import { NextRequest, NextResponse } from "next/server";
import { getApiContext, requireRole, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";

/**
 * 월별 결산 리포트 API
 *
 * GET /api/reports/monthly?month=YYYY-MM
 *
 * 응답:
 *   {
 *     month: "2026-04",
 *     finance: {
 *       income, expense, net,
 *       transactionCount,
 *       categories: [{ label, amount, type, count }],
 *     },
 *     matches: {
 *       total, wins, draws, losses,
 *       goalsFor, goalsAgainst,
 *     },
 *     attendance: {
 *       totalParticipants,     // 누적 출석 인원
 *       avgPerMatch,          // 경기당 평균
 *     }
 *   }
 */

/**
 * 월 파싱 — KST(+09:00) 기준 월 경계 사용
 * UTC 기준으로 하면 자정 전후 KST 기록이 다른 달로 분류되는 문제 발생
 */
function parseMonth(raw: string | null): { ym: string; start: string; endExclusive: string; dateEnd: string } | null {
  const now = new Date();
  const defaultYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ym = raw && /^\d{4}-\d{2}$/.test(raw) ? raw : defaultYm;
  const [y, m] = ym.split("-").map(Number);
  // KST(+09:00) 기준 월 경계 — 한국 서비스에서 자정 기록이 다음 달로 잘리는 문제 방지
  const start = `${y}-${String(m).padStart(2, "0")}-01T00:00:00+09:00`;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const endExclusive = `${nextY}-${String(nextM).padStart(2, "0")}-01T00:00:00+09:00`;
  // DATE 컬럼 비교용 (match_date)
  const dateEnd = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
  return { ym, start, endExclusive, dateEnd };
}

/** description 에서 대분류 추출 — OCR 자동 분류 태그(선납/휴면/지출/용병비) 우선 */
function classifyCategory(type: string, description: string | null): string {
  if (type === "EXPENSE") {
    if (!description) return "기타 지출";
    if (description.includes("용병")) return "용병비";
    if (description.includes("구장") || description.includes("운동장")) return "구장비";
    if (description.includes("유니폼") || description.includes("운동복")) return "유니폼";
    if (description.includes("회식") || description.includes("뒤풀이")) return "회식비";
    if (description.includes("장비") || description.includes("공") || description.includes("축구공")) return "장비";
    if (description.includes("심판")) return "심판비";
    return "기타 지출";
  }
  // INCOME
  if (!description) return "회비 수입";
  if (description.includes("선납")) return "선납";
  if (description.includes("벌금")) return "벌금 수입";
  if (description.includes("이자")) return "이자";
  return "회비 수입";
}

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  // STAFF 이상만 접근 (회비 재무 데이터 포함)
  const roleCheck = requireRole(ctx, PERMISSIONS.DUES_RECORD_ADD);
  if (roleCheck) return roleCheck;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const parsed = parseMonth(request.nextUrl.searchParams.get("month"));
  if (!parsed) return apiError("invalid month format (YYYY-MM)", 400);
  const { ym, start, endExclusive, dateEnd } = parsed;

  // 병렬 조회: 회비 거래 + 경기
  const [duesRes, matchesRes] = await Promise.all([
    db
      .from("dues_records")
      .select("type, amount, description, recorded_at")
      .eq("team_id", ctx.teamId)
      .gte("recorded_at", start)
      .lt("recorded_at", endExclusive),
    db
      .from("matches")
      // 월별 결산은 발생한 모든 경기 집계 — stats_included/match_type 필터 제거
      // (records/season-awards 는 커리어 통계용이라 stats_included=false 제외하지만,
      //  결산은 "이번 달에 얼마나 뛰었나" 기준이므로 자체전·이벤트전 포함)
      .select("id, match_date, match_type")
      .eq("team_id", ctx.teamId)
      .eq("status", "COMPLETED")
      .gte("match_date", ym + "-01")
      .lt("match_date", dateEnd),
  ]);

  // 재무 집계
  type DuesRow = { type: "INCOME" | "EXPENSE"; amount: number; description: string | null };
  const duesRows = (duesRes.data ?? []) as DuesRow[];
  const income = duesRows.filter((r) => r.type === "INCOME").reduce((s, r) => s + (r.amount ?? 0), 0);
  const expense = duesRows.filter((r) => r.type === "EXPENSE").reduce((s, r) => s + (r.amount ?? 0), 0);
  const net = income - expense;

  // 카테고리 집계
  const categoryMap = new Map<string, { label: string; amount: number; type: string; count: number }>();
  for (const r of duesRows) {
    const label = classifyCategory(r.type, r.description);
    const existing = categoryMap.get(`${r.type}:${label}`);
    if (existing) {
      existing.amount += r.amount ?? 0;
      existing.count += 1;
    } else {
      categoryMap.set(`${r.type}:${label}`, {
        label,
        amount: r.amount ?? 0,
        type: r.type,
        count: 1,
      });
    }
  }
  const categories = [...categoryMap.values()].sort((a, b) => b.amount - a.amount);

  // 경기 집계 — 완료된 경기 전체 (자체전·이벤트전 포함)
  type MatchRow = { id: string; match_type: string | null };
  const matchRows = (matchesRes.data ?? []) as MatchRow[];
  const matchIds = matchRows.map((m) => m.id);

  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
  let totalParticipants = 0;

  if (matchIds.length > 0) {
    // 골 데이터 + 출석 데이터 병렬 조회
    const [goalsRes, attRes] = await Promise.all([
      db
        .from("match_goals")
        .select("match_id, scorer_id, is_own_goal")
        .in("match_id", matchIds),
      db
        .from("match_attendance")
        .select("match_id, attendance_status, vote")
        .in("match_id", matchIds),
    ]);

    type GoalRow = { match_id: string; scorer_id: string | null; is_own_goal: boolean | null };
    const goalRows = (goalsRes.data ?? []) as GoalRow[];

    const scoreByMatch = new Map<string, { our: number; opp: number }>();
    for (const g of goalRows) {
      const s = scoreByMatch.get(g.match_id) ?? { our: 0, opp: 0 };
      // OPPONENT 레코드 또는 자책골 → 상대팀 득점
      // scorer_id가 null인 경우 = 득점자 모름 → 우리팀 골로 집계
      if (g.scorer_id === "OPPONENT" || g.is_own_goal === true) {
        s.opp++;
      } else {
        s.our++;
      }
      scoreByMatch.set(g.match_id, s);
    }

    for (const mid of matchIds) {
      const s = scoreByMatch.get(mid) ?? { our: 0, opp: 0 };
      goalsFor += s.our;
      goalsAgainst += s.opp;
      if (s.our > s.opp) wins++;
      else if (s.our === s.opp) draws++;
      else losses++;
    }

    // 출석 집계 — attendance_status 우선, NULL이면 vote='ATTEND' 폴백
    // (attendance_status 는 마이그레이션 이전 레코드에서 NULL일 수 있음)
    type AttRow = { match_id: string; attendance_status: string | null; vote: string | null };
    const attRows = (attRes.data ?? []) as AttRow[];
    totalParticipants = attRows.filter((a) => {
      if (a.attendance_status === "PRESENT" || a.attendance_status === "LATE") return true;
      if (a.attendance_status == null && a.vote === "ATTEND") return true;
      return false;
    }).length;
  }

  const avgPerMatch = matchRows.length > 0 ? Math.round((totalParticipants / matchRows.length) * 10) / 10 : 0;

  return apiSuccess({
    month: ym,
    finance: {
      income,
      expense,
      net,
      transactionCount: duesRows.length,
      categories,
    },
    matches: {
      total: matchRows.length,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
    },
    attendance: {
      totalParticipants,
      avgPerMatch,
    },
  });
}
