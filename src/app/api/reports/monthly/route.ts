import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

function parseMonth(raw: string | null): { ym: string; start: string; endExclusive: string } | null {
  const now = new Date();
  const defaultYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ym = raw && /^\d{4}-\d{2}$/.test(raw) ? raw : defaultYm;
  const [y, m] = ym.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01T00:00:00.000Z`;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const endExclusive = `${nextY}-${String(nextM).padStart(2, "0")}-01T00:00:00.000Z`;
  return { ym, start, endExclusive };
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

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const parsed = parseMonth(request.nextUrl.searchParams.get("month"));
  if (!parsed) return apiError("invalid month format (YYYY-MM)", 400);
  const { ym, start, endExclusive } = parsed;

  // 병렬 조회: 회비 거래 + 경기 + 출석
  const [duesRes, matchesRes] = await Promise.all([
    db
      .from("dues_records")
      .select("type, amount, description, recorded_at")
      .eq("team_id", ctx.teamId)
      .gte("recorded_at", start)
      .lt("recorded_at", endExclusive),
    db
      .from("matches")
      .select("id, match_date, status, stats_included, match_type")
      .eq("team_id", ctx.teamId)
      .eq("status", "COMPLETED")
      .gte("match_date", ym + "-01")
      .lt("match_date", endExclusive.slice(0, 10)),
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

  // 경기 집계 (stats_included 필터 — EVENT 는 제외)
  type MatchRow = { id: string; status: string; stats_included: boolean | null; match_type: string | null };
  const matchRows = ((matchesRes.data ?? []) as MatchRow[]).filter(
    (m) => m.stats_included !== false && m.match_type !== "EVENT",
  );
  const matchIds = matchRows.map((m) => m.id);

  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
  let totalParticipants = 0;

  if (matchIds.length > 0) {
    // 골 데이터
    const { data: goalsData } = await db
      .from("match_goals")
      .select("match_id, scorer_id, is_own_goal")
      .in("match_id", matchIds);
    type GoalRow = { match_id: string; scorer_id: string; is_own_goal: boolean };
    const goalRows = (goalsData ?? []) as GoalRow[];

    const scoreByMatch = new Map<string, { our: number; opp: number }>();
    for (const g of goalRows) {
      const s = scoreByMatch.get(g.match_id) ?? { our: 0, opp: 0 };
      if (g.scorer_id === "OPPONENT" || g.is_own_goal) s.opp++;
      else s.our++;
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

    // 출석 집계 (PRESENT + LATE)
    const { data: attData } = await db
      .from("match_attendance")
      .select("match_id")
      .in("match_id", matchIds)
      .in("attendance_status", ["PRESENT", "LATE"]);
    totalParticipants = attData?.length ?? 0;
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
