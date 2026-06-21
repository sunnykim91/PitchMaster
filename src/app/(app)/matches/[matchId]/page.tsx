import { auth } from "@/lib/auth";
import { getMatchDetailData } from "@/lib/server/getMatchDetailData";
import MatchDetailClient from "@/app/(app)/matches/[matchId]/MatchDetailClient";
import { getKstToday } from "@/lib/kstDate";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const session = await auth();

  if (!session) {
    return null;
  }

  // AI 기능 — 전체 공개. 풋살 팀은 클라이언트 레벨에서 sportType === "SOCCER" 조건으로 제외됨.
  // rate limit: AI 풀 플랜 경기당 2회 + 팀 월 10회 / AI 코치 경기당 3회 + 팀 월 10회
  const enableAi = true;
  const initialData = await getMatchDetailData(matchId, session.user.teamId!, enableAi, session.user.id);

  // 서버에서 "미래 경기" 여부 판단 → 클라이언트 hydration 일치 + LCP 개선
  // KST 기준 — 서버(UTC)에서 new Date().toISOString() 쓰면 KST 00:00~09:00 에 하루 밀림
  const todayIso = getKstToday();

  return (
    <MatchDetailClient
      matchId={matchId}
      userId={session.user.id}
      userRole={session.user.teamRole}
      initialData={initialData}
      todayIso={todayIso}
      enableAi={enableAi}
    />
  );
}
