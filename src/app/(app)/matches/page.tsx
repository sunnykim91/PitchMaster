import { auth } from "@/lib/auth";
import MatchesClient from "@/app/(app)/matches/MatchesClient";
import { getMatchesData } from "@/lib/server/getMatchesData";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SportType } from "@/lib/types";

export default async function MatchesPage() {
  const session = await auth();
  if (!session) return null;

  // matches + sport_type 병렬 조회
  const db = getSupabaseAdmin();
  const [initialMatches, sportType] = await Promise.all([
    getMatchesData(session.user.teamId!),
    (async (): Promise<SportType> => {
      if (!db || !session.user.teamId) return "SOCCER";
      const { data: team } = await db.from("teams").select("sport_type").eq("id", session.user.teamId).single();
      return (team?.sport_type as SportType) ?? "SOCCER";
    })(),
  ]);

  return (
    <MatchesClient
      userId={session.user.id}
      userRole={session.user.teamRole}
      initialMatches={initialMatches}
      sportType={sportType}
    />
  );
}
