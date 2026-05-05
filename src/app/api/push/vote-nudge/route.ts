import { NextRequest, NextResponse } from "next/server";
import { getApiContext, requireRole, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { sendTeamPush } from "@/lib/server/sendPush";
import { getActiveExemptions } from "@/lib/server/getActiveExemptions";

/** 운영진이 특정 경기의 미투표자에게 투표독려 알림 발송 */
export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const roleCheck = requireRole(ctx, PERMISSIONS.MATCH_EDIT);
  if (roleCheck) return roleCheck;

  const { matchId } = await request.json();
  if (!matchId) return apiError("matchId required", 400);

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 경기 정보 조회
  const { data: match } = await db
    .from("matches")
    .select("match_date, opponent_name")
    .eq("id", matchId)
    .eq("team_id", ctx.teamId)
    .single();

  if (!match) return apiError("Match not found", 404);

  // 팀 전체 멤버 (연동된 user_id가 있는)
  const { data: members } = await db
    .from("team_members")
    .select("user_id")
    .eq("team_id", ctx.teamId)
    .eq("status", "ACTIVE")
    .not("user_id", "is", null);

  const allUserIdsRaw = (members ?? []).map((m) => m.user_id).filter(Boolean) as string[];
  // 면제/휴회/부상 회원 제외
  const exemptions = await getActiveExemptions(ctx.teamId);
  const allUserIds = allUserIdsRaw.filter((uid) => !exemptions.has(uid));

  // 이미 투표한 유저 제외
  const { data: voted } = await db
    .from("match_attendance")
    .select("user_id")
    .eq("match_id", matchId)
    .not("user_id", "is", null);

  const votedIds = new Set((voted ?? []).map((v) => v.user_id));
  const unvotedIds = allUserIds.filter((uid) => !votedIds.has(uid));

  if (unvotedIds.length === 0) {
    return apiSuccess({ sent: 0, message: "모든 멤버가 이미 투표했습니다" });
  }

  const opponent = match.opponent_name || "상대 미정";
  const result = await sendTeamPush(ctx.teamId!, {
    title: "참석 투표를 완료해주세요!",
    body: `${match.match_date} vs ${opponent} — 아직 투표하지 않으셨습니다`,
    url: `/matches/${matchId}?tab=vote`,
    userIds: unvotedIds,
  });

  return apiSuccess({ ...result, unvoted: unvotedIds.length });
}
