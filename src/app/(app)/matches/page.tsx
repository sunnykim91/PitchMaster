import { auth } from "@/lib/auth";
import MatchesClient from "@/app/(app)/matches/MatchesClient";
import { getMatchesData } from "@/lib/server/getMatchesData";

export default async function MatchesPage() {
  const session = await auth();
  if (!session) return null;
  const initialMatches = await getMatchesData(session.user.teamId!);
  return (
    <MatchesClient
      userId={session.user.id}
      userRole={session.user.teamRole}
      initialMatches={initialMatches}
    />
  );
}
