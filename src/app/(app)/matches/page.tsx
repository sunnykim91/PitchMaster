import { auth } from "@/lib/auth";
import MatchesClient from "@/app/(app)/matches/MatchesClient";
import { getMatchesData } from "@/lib/server/getMatchesData";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SportType } from "@/lib/types";

export default async function MatchesPage() {
  const session = await auth();
  if (!session) return null;
  const initialMatches = await getMatchesData(session.user.teamId!);

  // 팀의 sport_type 조회
  let sportType: SportType = "SOCCER";
  const db = getSupabaseAdmin();
  if (db && session.user.teamId) {
    const { data: team } = await db.from("teams").select("sport_type").eq("id", session.user.teamId).single();
    if (team?.sport_type) sportType = team.sport_type as SportType;
  }

  return (
    <MatchesClient
      userId={session.user.id}
      userRole={session.user.teamRole}
      initialMatches={initialMatches}
      sportType={sportType}
    />
  );
}
