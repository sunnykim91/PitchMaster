import { auth } from "@/lib/auth";
import MatchesClient from "@/app/(app)/matches/MatchesClient";

export default async function MatchesPage() {
  const session = await auth();
  if (!session) return null;
  return <MatchesClient userId={session.user.id} userRole={session.user.teamRole} />;
}
