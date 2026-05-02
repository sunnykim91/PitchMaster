import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  calculatePitchScore,
  pitchScoreToLevel,
} from "@/lib/playerAttributes/aggregate";
import type {
  AttributeCode,
  EvaluationSource,
  EvaluationContext,
  AttributeLevel,
  AttributeCategory,
  TripleTrustInput,
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
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const { userId } = await params;
  if (!userId) return apiError("userId required");

  const sb = getSupabaseAdmin();
  if (!sb) return apiError("DB unavailable", 503);

  const [codesRes, evalsRes] = await Promise.all([
    sb
      .from("player_attribute_codes")
      .select("code, name_ko, category, display_order, gk_only")
      .order("display_order"),
    sb
      .from("player_evaluations")
      .select("attribute_code, score, source, context, created_at")
      .eq("target_user_id", userId),
  ]);

  if (codesRes.error) return apiError(codesRes.error.message, 500);
  if (evalsRes.error) return apiError(evalsRes.error.message, 500);

  const codes = (codesRes.data ?? []) as CodeRow[];
  const evaluations = (evalsRes.data ?? []) as EvaluationRow[];

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

  return apiSuccess({
    user_id: userId,
    attributes,
    algorithm: "Triple Trust",
    product: "PitchScore",
  });
}
