import { auth } from "@/lib/auth";
import SettingsClient from "@/app/(app)/settings/SettingsClient";
import type { TeamSettingsData } from "@/app/(app)/settings/TeamSettings";
import { getSettingsData } from "@/lib/server/getSettingsData";

export default async function SettingsPage() {
  const session = await auth();

  if (!session) {
    return null;
  }

  const initialData = await getSettingsData(session.user.id, session.user.teamId ?? "");
  const t = initialData.team as Record<string, unknown> | null;

  return (
    <SettingsClient
      sessionProfile={{
        name: session.user.name ?? "",
        phone: session.user.phone ?? "",
        preferredPositions: session.user.preferredPositions ?? [],
        preferredFoot: session.user.preferredFoot ?? "RIGHT",
        profileImageUrl: session.user.profileImageUrl ?? "",
      }}
      sessionTeam={{
        teamName: session.user.teamName ?? "",
        logoUrl: (t?.logo_url as string | null) ?? "",
        inviteCode: session.user.inviteCode ?? "",
        uniformPrimary: (t?.uniform_primary as string) ?? "#2563eb",
        uniformSecondary: (t?.uniform_secondary as string) ?? "#f97316",
        uniformPattern:
          (t?.uniform_pattern as TeamSettingsData["uniformPattern"]) ?? "SOLID",
        uniforms: (t?.uniforms as TeamSettingsData["uniforms"]) ?? null,
        isSearchable: (t?.is_searchable as boolean) ?? false,
        joinMode: (t?.join_mode as "MANUAL" | "AUTO") ?? "MANUAL",
        defaultFormationId: (t?.default_formation_id as string | null) ?? "",
        statsRecordingStaffOnly: (t?.stats_recording_staff_only as boolean) ?? false,
        mvpVoteStaffOnly: (t?.mvp_vote_staff_only as boolean) ?? false,
        sportType: ((t?.sport_type as string) === "FUTSAL" ? "FUTSAL" : "SOCCER"),
        defaultPlayerCount: (t?.default_player_count as number | undefined) ?? undefined,
      }}
      userRole={session.user.teamRole}
      initialData={initialData}
    />
  );
}
