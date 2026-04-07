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
  const [initialMatches, teamInfo] = await Promise.all([
    getMatchesData(session.user.teamId!),
    (async () => {
      if (!db || !session.user.teamId) return { sportType: "SOCCER" as SportType, uniformPrimary: null as string | null, uniformSecondary: null as string | null, uniformPattern: null as string | null };
      const { data: team } = await db.from("teams").select("sport_type, uniform_primary, uniform_secondary, uniform_pattern, uniforms").eq("id", session.user.teamId).single();
      return {
        sportType: (team?.sport_type as SportType) ?? "SOCCER",
        uniformPrimary: team?.uniform_primary ?? null,
        uniformSecondary: team?.uniform_secondary ?? null,
        uniformPattern: team?.uniform_pattern ?? null,
        uniforms: (team as { uniforms?: unknown })?.uniforms ?? null,
      };
    })(),
  ]);

  return (
    <MatchesClient
      userId={session.user.id}
      userRole={session.user.teamRole}
      initialMatches={initialMatches}
      sportType={teamInfo.sportType}
      teamUniform={{ primary: teamInfo.uniformPrimary, secondary: teamInfo.uniformSecondary, pattern: teamInfo.uniformPattern, uniforms: teamInfo.uniforms as any }}
    />
  );
}
