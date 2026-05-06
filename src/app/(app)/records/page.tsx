import { auth } from "@/lib/auth";
import RecordsClient from "@/app/(app)/records/RecordsClient";
import { getRecordsData } from "@/lib/server/getRecordsData";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SportType } from "@/lib/playerAttributes/types";

export default async function RecordsPage() {
  const session = await auth();
  if (!session) return null;

  // PitchScore Phase 2C — 44차 검증 후 전체 오픈 (45차, 2026-05-06).
  const enablePitchScore = true;

  let sportType: SportType | null = null;
  if (enablePitchScore && session.user.teamId) {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb
        .from("teams")
        .select("sport_type")
        .eq("id", session.user.teamId)
        .maybeSingle();
      const raw = data?.sport_type;
      if (raw === "SOCCER" || raw === "FUTSAL") sportType = raw;
    }
  }

  const initialData = await getRecordsData(session.user.teamId!);
  return (
    <RecordsClient
      userId={session.user.id}
      userName={session.user.name ?? "나"}
      userRole={session.user.teamRole}
      initialData={initialData}
      teamId={session.user.teamId ?? null}
      sportType={sportType}
      enablePitchScore={enablePitchScore}
    />
  );
}
