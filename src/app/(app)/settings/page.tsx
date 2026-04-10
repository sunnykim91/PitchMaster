import { auth } from "@/lib/auth";
import SettingsClient from "@/app/(app)/settings/SettingsClient";
import { getSettingsData } from "@/lib/server/getSettingsData";

export default async function SettingsPage() {
  const session = await auth();

  if (!session) {
    return null;
  }

  const initialData = await getSettingsData(session.user.id, session.user.teamId ?? "");

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
        logoUrl: "",
        inviteCode: session.user.inviteCode ?? "",
        uniformPrimary: "#2563eb",
        uniformSecondary: "#f97316",
        uniformPattern: "SOLID",
        uniforms: null,
        isSearchable: false,
        joinMode: "MANUAL",
        defaultFormationId: "",
        statsRecordingStaffOnly: false,
      }}
      userRole={session.user.teamRole}
      initialData={initialData}
    />
  );
}
