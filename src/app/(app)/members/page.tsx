import { auth } from "@/lib/auth";
import MembersClient from "./MembersClient";
import { getMembersData } from "@/lib/server/getMembersData";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SportType } from "@/lib/playerAttributes/types";

export default async function MembersPage() {
  const session = await auth();
  if (!session) return null;
  const initialData = await getMembersData(session.user.teamId!, session.user.teamRole);

  // PitchScore Phase 2C — 동료 평가 카드 점진 출시 (김선휘만, /player/[id] 와 동일 게이트)
  const enablePitchScore = session.user.name === "김선휘";

  // 팀 sport_type — 동료 평가 모달이 평가 저장 시 필요. enablePitchScore=true 일 때만 조회.
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
      if (raw === "SOCCER" || raw === "FUTSAL") {
        sportType = raw;
      }
    }
  }

  return (
    <MembersClient
      userRole={session.user.teamRole}
      userId={session.user.id}
      initialData={initialData}
      teamId={session.user.teamId ?? null}
      sportType={sportType}
      enablePitchScore={enablePitchScore}
    />
  );
}
