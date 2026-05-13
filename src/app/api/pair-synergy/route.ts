import { NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { isStaffOrAbove } from "@/lib/permissions";
import { getPairSynergy } from "@/lib/server/getPairSynergy";

/**
 * GET /api/pair-synergy — 팀 페어 매트릭스 (STAFF+ only)
 *
 * 일반 회원에게 노출하지 않음 — "왜 나랑은 같이 안 뛰지" 정치 회피.
 * 시즌 누적 페어 W/D/L. 전술 탭·페어 시너지 페이지에서 사용.
 */
export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;
  if (!isStaffOrAbove(ctx.teamRole)) return apiError("운영진만 조회할 수 있어요.", 403);

  const matrix = await getPairSynergy(ctx.teamId);
  return apiSuccess(matrix);
}
