import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  calculatePitchScore,
  pitchScoreToLevel,
} from "@/lib/playerAttributes/aggregate";
import {
  generatePitchComment,
  type CategoryAvgInput,
} from "@/lib/playerAttributes/comment";
import {
  recommendPositions,
  type AttributeScoreLookup,
} from "@/lib/playerAttributes/position";
import type {
  AttributeCode,
  EvaluationSource,
  EvaluationContext,
  AttributeLevel,
  AttributeCategory,
  TripleTrustInput,
  SportType,
} from "@/lib/playerAttributes/types";

type EvaluationRow = {
  attribute_code: AttributeCode;
  score: AttributeLevel;
  source: EvaluationSource;
  context: EvaluationContext;
  created_at: string;
};

type CodeRow = {
  code: AttributeCode;
  name_ko: string;
  category: AttributeCategory;
  display_order: number;
  gk_only: boolean;
  applicable_sports: SportType[];
};

const COMMENT_MIN_SAMPLES = 5;
const VALID_SPORTS: SportType[] = ["SOCCER", "FUTSAL"];

/**
 * sport_type 결정 우선순위:
 *   1) ?sport=SOCCER|FUTSAL 쿼리 파라미터
 *   2) viewer 의 현재 팀 sport_type
 *   3) SOCCER 디폴트
 */
async function resolveSportType(
  request: NextRequest,
  ctx: { teamId?: string },
  sb: ReturnType<typeof getSupabaseAdmin>,
): Promise<SportType> {
  const sportParam = request.nextUrl.searchParams.get("sport");
  if (sportParam && VALID_SPORTS.includes(sportParam as SportType)) {
    return sportParam as SportType;
  }
  if (ctx.teamId && sb) {
    const { data: team } = await sb
      .from("teams")
      .select("sport_type")
      .eq("id", ctx.teamId)
      .maybeSingle();
    if (team?.sport_type && VALID_SPORTS.includes(team.sport_type as SportType)) {
      return team.sport_type as SportType;
    }
  }
  return "SOCCER";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const { userId } = await params;
  if (!userId) return apiError("userId required");

  const sb = getSupabaseAdmin();
  if (!sb) return apiError("DB unavailable", 503);

  const sportType = await resolveSportType(request, ctx, sb);

  const [codesRes, evalsRes, targetRes] = await Promise.all([
    sb
      .from("player_attribute_codes")
      .select("code, name_ko, category, display_order, gk_only, applicable_sports")
      .order("display_order"),
    sb
      .from("player_evaluations")
      .select("attribute_code, score, source, context, created_at")
      .eq("target_user_id", userId)
      .eq("sport_type", sportType),
    sb
      .from("users")
      .select("preferred_positions")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (codesRes.error) return apiError(codesRes.error.message, 500);
  if (evalsRes.error) return apiError(evalsRes.error.message, 500);

  const allCodes = (codesRes.data ?? []) as CodeRow[];
  // 현재 sport_type 에 적용되는 능력치만 (풋살이면 4개 자동 제외)
  const codes = allCodes.filter((c) => c.applicable_sports.includes(sportType));
  const evaluations = (evalsRes.data ?? []) as EvaluationRow[];
  const preferredPositions = (targetRes.data?.preferred_positions ?? []) as string[];
  // 1순위 포지션이 GK일 때만 GK로 분류 (보조로 GK 등록한 필드 선수 오분류 방지)
  const isGoalkeeper = preferredPositions[0]?.toUpperCase() === "GK";

  // 적용 능력치 PitchScore 계산 (풋살이면 18개, 축구면 22개)
  const attributes = codes.map((code) => {
    const inputs: TripleTrustInput[] = evaluations
      .filter((e) => e.attribute_code === code.code)
      .map((e) => ({
        score: e.score,
        source: e.source,
        context: e.context,
        created_at: e.created_at,
      }));

    const result = calculatePitchScore(inputs);

    return {
      attribute_code: code.code,
      name_ko: code.name_ko,
      category: code.category,
      display_order: code.display_order,
      gk_only: code.gk_only,
      pitch_score: result.pitch_score,
      sample_count: result.sample_count,
      level: result.sample_count > 0 ? pitchScoreToLevel(result.pitch_score) : null,
    };
  });

  // 가시 attributes (필드 선수면 GK 전용 제외)
  const visible = attributes.filter((a) => isGoalkeeper || !a.gk_only);
  const totalSamples = visible.reduce((sum, a) => sum + a.sample_count, 0);

  // 카테고리별 평균
  const byCategory = new Map<AttributeCategory, { sum: number; count: number }>();
  for (const a of visible) {
    if (a.sample_count === 0) continue;
    const e = byCategory.get(a.category) ?? { sum: 0, count: 0 };
    e.sum += a.pitch_score;
    e.count += 1;
    byCategory.set(a.category, e);
  }
  const category_averages: CategoryAvgInput[] = [...byCategory.entries()].map(
    ([cat, e]) => ({
      category: cat,
      avg: Math.round((e.sum / e.count) * 100) / 100,
      count: e.count,
    }),
  );

  // 룰 기반 한 줄 코멘트 (5명 이상 평가 누적 시)
  const comment =
    totalSamples >= COMMENT_MIN_SAMPLES
      ? generatePitchComment(category_averages)
      : null;

  // 룰 기반 포지션 추천 (5명 이상 평가 누적 시)
  let recommended_positions: ReturnType<typeof recommendPositions> = [];
  if (totalSamples >= COMMENT_MIN_SAMPLES) {
    const scoreMap = new Map<AttributeCode, AttributeScoreLookup>();
    for (const a of attributes) {
      scoreMap.set(a.attribute_code, {
        pitch_score: a.pitch_score,
        sample_count: a.sample_count,
        name_ko: a.name_ko,
      });
    }
    recommended_positions = recommendPositions(scoreMap, isGoalkeeper, 3);
  }

  // 전체 평균 PitchScore (시각 단순 표시용)
  const ratedVisible = visible.filter((a) => a.sample_count > 0);
  const overall_pitch_score =
    ratedVisible.length > 0
      ? Math.round(
          (ratedVisible.reduce((s, a) => s + a.pitch_score, 0) / ratedVisible.length) *
            100,
        ) / 100
      : 0;

  return apiSuccess({
    user_id: userId,
    sport_type: sportType,
    is_goalkeeper: isGoalkeeper,
    attributes,
    category_averages,
    overall_pitch_score,
    total_samples: totalSamples,
    comment,
    recommended_positions,
    algorithm: "Triple Trust",
    product: "PitchScore",
  });
}
