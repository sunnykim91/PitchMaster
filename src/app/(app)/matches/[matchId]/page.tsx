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

  const initialData = await getMatchDetailData(matchId, session.user.teamId!);

  return (
    <MatchDetailClient
      matchId={matchId}
      userId={session.user.id}
      userRole={session.user.teamRole}
      initialData={initialData}
    />
  );
}
