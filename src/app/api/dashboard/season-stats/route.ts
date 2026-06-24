import { NextResponse } from "next/server";
import { getApiContext, apiSuccess } from "@/lib/api-helpers";
import { getDashboardSeasonStats } from "@/lib/server/getDashboardData";

/**
 * 대시보드 시즌 통계(팀 전적 + 본인 시즌 기록) 전용 엔드포인트.
 * getDashboardData 의 무거운 시즌 집계를 SSR 렌더 경로에서 분리 — DashboardClient 가
 * 화면을 그린 뒤 이 엔드포인트로 따로 불러와 전적·시즌기록 카드를 채운다.
 */
export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const data = await getDashboardSeasonStats(ctx.teamId, ctx.userId);
  // 무거운 시즌 집계 — 본인 전용(private) 60초 캐시로 TWA 재진입·포커스 복귀 시 재집계/재요청 차단.
  // (경기 결과는 초 단위로 안 바뀌므로 60초 staleness 무해)
  const res = apiSuccess(data);
  res.headers.set("Cache-Control", "private, max-age=60");
  return res;
}
