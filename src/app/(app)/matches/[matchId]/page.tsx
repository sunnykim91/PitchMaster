import { auth } from "@/lib/auth";
import { getMatchDetailData } from "@/lib/server/getMatchDetailData";
import MatchDetailClient from "@/app/(app)/matches/[matchId]/MatchDetailClient";

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

  // AI Feature Flag: 김선휘만 AI 생성 트리거 (경기 후기·AI 코치 분석 공통)
  const enableAi = session.user.name === "김선휘";
  const initialData = await getMatchDetailData(matchId, session.user.teamId!, enableAi, session.user.id);

  // 서버에서 "미래 경기" 여부 판단 → 클라이언트 hydration 일치 + LCP 개선
  const todayIso = new Date().toISOString().slice(0, 10);

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
