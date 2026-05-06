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
  SportType,
} from "@/lib/playerAttributes/types";

interface EvaluatePayload {
  attribute_code: AttributeCode;
  score: AttributeLevel;
  context?: EvaluationContext;
  match_id?: string | null;
  /** 평가 컨텍스트 팀 (UI에서 보고 있는 팀). 미지정 시 ctx.teamId 폴백 */
  team_id?: string;
}

const VALID_CONTEXTS: EvaluationContext[] = ["ROUND", "FREE", "POST_MATCH"];
const VALID_SPORTS: SportType[] = ["SOCCER", "FUTSAL"];

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

  const { attribute_code, score, context = "FREE", match_id = null, team_id } = body;
  if (!attribute_code) return apiError("attribute_code required");
  if (typeof score !== "number" || score < 1 || score > 5 || !Number.isInteger(score)) {
    return apiError("score must be integer 1~5");
  }
  if (!VALID_CONTEXTS.includes(context as EvaluationContext)) {
    return apiError("invalid context");
  }

  const sb = getSupabaseAdmin();
  if (!sb) return apiError("DB unavailable", 503);

  // 권한 (45차 후속 "감독 노트" 정책): 운영진(STAFF+) 만 평가 가능.
  // 일반회원의 자가 평가도 비활성 — PitchScore 는 운영진 전용 도구.
  const isStaffEvaluator = ctx.teamRole === "PRESIDENT" || ctx.teamRole === "STAFF";
  if (!isStaffEvaluator) {
    return apiError("능력치 평가는 운영진만 가능합니다", 403);
  }

  // 평가 컨텍스트 팀 결정 — 클라이언트가 team_id 명시했으면 그 팀 (단 evaluator 가입 검증),
  // 없으면 ctx.teamId 폴백. 위변조 방지: evaluator가 그 팀에 ACTIVE 멤버여야 함.
  const requestedTeamId = team_id ?? ctx.teamId;
  if (!requestedTeamId) return apiError("팀 정보가 없습니다", 400);

  if (team_id && team_id !== ctx.teamId) {
    // 다른 팀 컨텍스트 요청 시 evaluator 가입 검증
    const { data: evaluatorMembership, error: membershipErr } = await sb
      .from("team_members")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("team_id", team_id)
      .in("status", ["ACTIVE", "DORMANT"])
      .limit(1);
    if (membershipErr) return apiError(membershipErr.message, 500);
    if (!evaluatorMembership || evaluatorMembership.length === 0) {
      return apiError("해당 팀의 멤버가 아닙니다", 403);
    }
  }

  // 평가 컨텍스트 팀의 sport_type 조회
  const { data: contextTeam, error: teamErr } = await sb
    .from("teams")
    .select("sport_type")
    .eq("id", requestedTeamId)
    .maybeSingle();
  if (teamErr) return apiError(teamErr.message, 500);
  if (!contextTeam?.sport_type) return apiError("팀 sport_type 미설정", 400);
  const sportType = contextTeam.sport_type as SportType;
  if (!VALID_SPORTS.includes(sportType)) {
    return apiError(`unsupported sport_type: ${sportType}`, 400);
  }

  // attribute_code 존재 + 해당 sport_type 에 적용되는지 검증
  const { data: codeRow, error: codeErr } = await sb
    .from("player_attribute_codes")
    .select("code, applicable_sports")
    .eq("code", attribute_code)
    .maybeSingle();
  if (codeErr) return apiError(codeErr.message, 500);
  if (!codeRow) return apiError("unknown attribute_code", 400);
  const applicableSports = (codeRow.applicable_sports ?? []) as SportType[];
  if (!applicableSports.includes(sportType)) {
    return apiError(
      `${attribute_code} 능력치는 ${sportType} 종목에 적용되지 않습니다`,
      400,
    );
  }

  // target user 존재 검증
  const { data: targetUser, error: targetErr } = await sb
    .from("users")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle();
  if (targetErr) return apiError(targetErr.message, 500);
  if (!targetUser) return apiError("target user not found", 404);

  // 같은 팀 검증 — 본인이 아니면 target과 evaluator가 같은 팀(평가 컨텍스트 팀) 소속이어야 평가 가능
  const isSelf = targetUserId === ctx.userId;
  if (!isSelf) {
    const { data: targetMembership, error: membershipErr } = await sb
      .from("team_members")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("team_id", requestedTeamId)
      .in("status", ["ACTIVE", "DORMANT"])
      .limit(1);
    if (membershipErr) return apiError(membershipErr.message, 500);
    if (!targetMembership || targetMembership.length === 0) {
      return apiError("같은 팀 멤버만 평가할 수 있습니다", 403);
    }
  }

  // source 자동 결정 — 같은 팀 검증 후라 ctx.teamRole 신뢰 가능
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
        team_id: requestedTeamId,
        sport_type: sportType,
        attribute_code,
        score,
        source,
        context,
        match_id,
        updated_at: now,
      },
      { onConflict: "target_user_id,evaluator_user_id,attribute_code,sport_type" },
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
  const teamIdParam = request.nextUrl.searchParams.get("team_id");
  if (!attribute_code) return apiError("attribute_code required");

  const sb = getSupabaseAdmin();
  if (!sb) return apiError("DB unavailable", 503);

  // 평가 컨텍스트 팀 결정 — POST 와 동일 패턴
  const requestedTeamId = teamIdParam ?? ctx.teamId;
  if (!requestedTeamId) return apiError("팀 정보가 없습니다", 400);

  if (teamIdParam && teamIdParam !== ctx.teamId) {
    const { data: evaluatorMembership } = await sb
      .from("team_members")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("team_id", teamIdParam)
      .in("status", ["ACTIVE", "DORMANT"])
      .limit(1);
    if (!evaluatorMembership || evaluatorMembership.length === 0) {
      return apiError("해당 팀의 멤버가 아닙니다", 403);
    }
  }

  const { data: contextTeam } = await sb
    .from("teams")
    .select("sport_type")
    .eq("id", requestedTeamId)
    .maybeSingle();
  const sportType = contextTeam?.sport_type as SportType | undefined;
  if (!sportType || !VALID_SPORTS.includes(sportType)) {
    return apiError("팀 sport_type 미설정", 400);
  }

  // 능력치가 해당 sport 에 적용되는지 검증 (POST 와 동일)
  const { data: codeRow } = await sb
    .from("player_attribute_codes")
    .select("applicable_sports")
    .eq("code", attribute_code)
    .maybeSingle();
  const applicableSports = (codeRow?.applicable_sports ?? []) as SportType[];
  if (!applicableSports.includes(sportType)) {
    return apiError(
      `${attribute_code} 능력치는 ${sportType} 종목에 적용되지 않습니다`,
      400,
    );
  }

  const { error } = await sb
    .from("player_evaluations")
    .delete()
    .eq("target_user_id", targetUserId)
    .eq("evaluator_user_id", ctx.userId)
    .eq("attribute_code", attribute_code)
    .eq("sport_type", sportType);

  if (error) return apiError(error.message, 500);
  return apiSuccess({ deleted: true });
}
