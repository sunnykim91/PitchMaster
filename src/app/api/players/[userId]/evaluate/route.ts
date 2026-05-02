import { NextRequest, NextResponse } from "next/server";
import {
  getApiContext,
  apiError,
  apiSuccess,
  demoGuard,
} from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  AttributeCode,
  AttributeLevel,
  EvaluationContext,
  EvaluationSource,
} from "@/lib/playerAttributes/types";

interface EvaluatePayload {
  attribute_code: AttributeCode;
  score: AttributeLevel;
  context?: EvaluationContext;
  match_id?: string | null;
}

const VALID_CONTEXTS: EvaluationContext[] = ["ROUND", "FREE", "POST_MATCH"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const guard = demoGuard(ctx);
  if (guard) return guard;

  const { userId: targetUserId } = await params;
  if (!targetUserId) return apiError("targetUserId required");

  let body: EvaluatePayload;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid JSON body");
  }

  const { attribute_code, score, context = "FREE", match_id = null } = body;
  if (!attribute_code) return apiError("attribute_code required");
  if (typeof score !== "number" || score < 1 || score > 5 || !Number.isInteger(score)) {
    return apiError("score must be integer 1~5");
  }
  if (!VALID_CONTEXTS.includes(context as EvaluationContext)) {
    return apiError("invalid context");
  }

  const sb = getSupabaseAdmin();
  if (!sb) return apiError("DB unavailable", 503);

  // attribute_code 존재 검증
  const { data: codeRow, error: codeErr } = await sb
    .from("player_attribute_codes")
    .select("code")
    .eq("code", attribute_code)
    .maybeSingle();
  if (codeErr) return apiError(codeErr.message, 500);
  if (!codeRow) return apiError("unknown attribute_code", 400);

  // target user 존재 검증
  const { data: targetUser, error: targetErr } = await sb
    .from("users")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle();
  if (targetErr) return apiError(targetErr.message, 500);
  if (!targetUser) return apiError("target user not found", 404);

  // source 자동 결정
  const isSelf = targetUserId === ctx.userId;
  const isStaffOrPresident =
    ctx.teamRole === "PRESIDENT" || ctx.teamRole === "STAFF";
  const source: EvaluationSource = isSelf
    ? "SELF"
    : isStaffOrPresident
      ? "STAFF"
      : "PEER";

  const now = new Date().toISOString();

  const { data, error } = await sb
    .from("player_evaluations")
    .upsert(
      {
        target_user_id: targetUserId,
        evaluator_user_id: ctx.userId,
        team_id: ctx.teamId,
        attribute_code,
        score,
        source,
        context,
        match_id,
        updated_at: now,
      },
      { onConflict: "target_user_id,evaluator_user_id,attribute_code" },
    )
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  return apiSuccess({ evaluation: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const guard = demoGuard(ctx);
  if (guard) return guard;

  const { userId: targetUserId } = await params;
  const attribute_code = request.nextUrl.searchParams.get("attribute_code");
  if (!attribute_code) return apiError("attribute_code required");

  const sb = getSupabaseAdmin();
  if (!sb) return apiError("DB unavailable", 503);

  const { error } = await sb
    .from("player_evaluations")
    .delete()
    .eq("target_user_id", targetUserId)
    .eq("evaluator_user_id", ctx.userId)
    .eq("attribute_code", attribute_code);

  if (error) return apiError(error.message, 500);
  return apiSuccess({ deleted: true });
}
