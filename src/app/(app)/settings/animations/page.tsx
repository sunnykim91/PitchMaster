import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { isStaffOrAbove } from "@/lib/permissions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SportType } from "@/lib/types";
import AnimationsListClient from "./AnimationsListClient";

export const metadata: Metadata = {
  title: "전술 애니메이션 — PitchMaster",
};

export default async function AnimationsListPage() {
  const session = await auth();
  if (!session) return null;

  if (!isStaffOrAbove(session.user.teamRole)) return notFound();

  const teamId = session.user.teamId ?? "";
  let sportType: SportType = "SOCCER";
  let defaultPlayerCount = 11;

  if (teamId) {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb
        .from("teams")
        .select("sport_type, default_player_count")
        .eq("id", teamId)
        .maybeSingle();
      if (data) {
        sportType = (data.sport_type as SportType) ?? "SOCCER";
        defaultPlayerCount = data.default_player_count ?? (sportType === "FUTSAL" ? 6 : 11);
      }
    }
  }

  return (
    <AnimationsListClient
      teamId={teamId}
      teamName={session.user.teamName ?? "우리 팀"}
      sportType={sportType}
      defaultPlayerCount={defaultPlayerCount}
    />
  );
}
