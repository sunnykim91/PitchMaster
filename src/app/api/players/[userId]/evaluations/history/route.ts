import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isStaffOrAbove } from "@/lib/permissions";
import type {
  AttributeCode,
  AttributeCategory,
  AttributeLevel,
  EvaluationSource,
  EvaluationContext,
  SportType,
} from "@/lib/playerAttributes/types";

const VALID_SPORTS: SportType[] = ["SOCCER", "FUTSAL"];

/**
 * Phase 2C 평가 이력 뷰 — evaluator 단위로 그룹핑한 timeline.
 *
 * 권한:
 *   - viewer === target: 본인 이력 가능
 *   - 운영진(STAFF+): 누구든 가능, evaluator 실명 노출
 *   - 그 외: 403
 *
 * 익명성 정책 B (사용자 결정):
 *   - 운영진 viewer → evaluator { id, name } 노출
 *   - 일반 viewer (자기 이력) → evaluator null 로 마스킹, source 라벨로 종류만 구분
 *
 * 그룹핑:
 *   - 한 evaluator 당 1 세션 (unique 제약상 evaluator 가 같은 능력치 재평가 시 update 만 발생)
 *   - 같은 evaluator 의 22 row 를 묶어 카테고리별 평균 + 전체 평균 + last_updated 반환
 */

interface EvaluationRow {
  evaluator_user_id: string;
  attribute_code: AttributeCode;
  score: AttributeLevel;
  source: EvaluationSource;
  context: EvaluationContext;
  created_at: string;
  updated_at: string;
}

interface CodeRow {
  code: AttributeCode;
  category: AttributeCategory;
}

interface UserRow {
  id: string;
  name: string | null;
}

interface SessionView {
  evaluator: { id: string; name: string } | null;
  source: EvaluationSource;
  context: EvaluationContext;
  last_updated: string;
  scores_count: number;
  avg_score: number;
  category_avgs: Array<{ category: AttributeCategory; avg: number; count: number }>;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const { userId: targetUserId } = await context.params;

  const sb = getSupabaseAdmin();
  if (!sb) return apiError("DB unavailable", 503);

  const isStaffViewer = isStaffOrAbove(ctx.teamRole);
  const isSelf = ctx.userId === targetUserId;

  if (!isStaffViewer && !isSelf) {
    return apiError("타인의 평가 이력은 운영진만 볼 수 있어요", 403);
  }

  // 자기팀 멤버 한정 — 다른 팀 STAFF 가 임의 user_id 조회 차단
  if (!isSelf) {
    const { data: memberCheck } = await sb
      .from("team_members")
      .select("id")
      .eq("team_id", ctx.teamId)
      .eq("user_id", targetUserId)
      .in("status", ["ACTIVE", "DORMANT"])
      .maybeSingle();
    if (!memberCheck) {
      return apiError("같은 팀 소속이 아닙니다", 403);
    }
  }

  // sport_type 결정 — viewer 활성 팀 기준 (단일 종목 평가만 노출)
  const sportParam = request.nextUrl.searchParams.get("sport");
  let sportType: SportType;
  if (sportParam && VALID_SPORTS.includes(sportParam as SportType)) {
    sportType = sportParam as SportType;
  } else {
    const { data: team } = await sb
      .from("teams")
      .select("sport_type")
      .eq("id", ctx.teamId)
      .maybeSingle();
    const t = team?.sport_type;
    sportType = t === "SOCCER" || t === "FUTSAL" ? (t as SportType) : "SOCCER";
  }

  // 평가 row + 능력치 카테고리 메타 동시 fetch
  const [evalRes, codesRes] = await Promise.all([
    sb
      .from("player_evaluations")
      .select("evaluator_user_id, attribute_code, score, source, context, created_at, updated_at")
      .eq("target_user_id", targetUserId)
      .eq("sport_type", sportType)
      .order("updated_at", { ascending: false }),
    sb.from("player_attribute_codes").select("code, category"),
  ]);

  if (evalRes.error) return apiError(evalRes.error.message, 500);
  if (codesRes.error) return apiError(codesRes.error.message, 500);

  const codeToCategory = new Map<AttributeCode, AttributeCategory>();
  for (const c of (codesRes.data ?? []) as CodeRow[]) {
    codeToCategory.set(c.code, c.category);
  }

  // evaluator 별로 row 그룹핑
  const grouped = new Map<string, EvaluationRow[]>();
  for (const row of (evalRes.data ?? []) as EvaluationRow[]) {
    const arr = grouped.get(row.evaluator_user_id) ?? [];
    arr.push(row);
    grouped.set(row.evaluator_user_id, arr);
  }

  // 운영진 viewer 면 evaluator 이름 한 번에 조회
  let evaluatorNameMap = new Map<string, string>();
  if (isStaffViewer && grouped.size > 0) {
    const evaluatorIds = [...grouped.keys()];
    const { data: users } = await sb
      .from("users")
      .select("id, name")
      .in("id", evaluatorIds);
    for (const u of (users ?? []) as UserRow[]) {
      if (u.name) evaluatorNameMap.set(u.id, u.name);
    }
  }

  const sessions: SessionView[] = [];
  for (const [evaluatorId, rows] of grouped) {
    const lastUpdated = rows.reduce(
      (acc, r) => (r.updated_at > acc ? r.updated_at : acc),
      rows[0].updated_at,
    );
    const totalScore = rows.reduce((acc, r) => acc + r.score, 0);
    const avg = rows.length > 0 ? totalScore / rows.length : 0;

    // 카테고리별 평균
    const catAggr = new Map<AttributeCategory, { sum: number; count: number }>();
    for (const r of rows) {
      const cat = codeToCategory.get(r.attribute_code);
      if (!cat) continue;
      const existing = catAggr.get(cat) ?? { sum: 0, count: 0 };
      existing.sum += r.score;
      existing.count += 1;
      catAggr.set(cat, existing);
    }
    const category_avgs = [...catAggr.entries()].map(([category, { sum, count }]) => ({
      category,
      avg: count > 0 ? sum / count : 0,
      count,
    }));

    // 최신 source / context 우선 (가장 최근 행 기준)
    const latestRow = rows.reduce((acc, r) => (r.updated_at > acc.updated_at ? r : acc), rows[0]);

    sessions.push({
      evaluator: isStaffViewer
        ? { id: evaluatorId, name: evaluatorNameMap.get(evaluatorId) ?? "이름 없음" }
        : null,
      source: latestRow.source,
      context: latestRow.context,
      last_updated: lastUpdated,
      scores_count: rows.length,
      avg_score: Math.round(avg * 100) / 100,
      category_avgs,
    });
  }

  sessions.sort((a, b) => (a.last_updated < b.last_updated ? 1 : -1));

  return apiSuccess({ sessions, sport_type: sportType, viewer_is_staff: isStaffViewer });
}
