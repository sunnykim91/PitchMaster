import { auth } from "@/lib/auth";
import MembersClient from "./MembersClient";
import { getMembersData } from "@/lib/server/getMembersData";

export default async function MembersPage() {
  const session = await auth();
  if (!session) return null;
  const initialData = await getMembersData(session.user.teamId!, session.user.teamRole);
  // PitchScore Feature Flag — 44차 검증 후 전체 오픈 (45차, 2026-05-06).
  const enablePitchScore = true;
  return (
    <MembersClient
      userRole={session.user.teamRole}
      userId={session.user.id}
      initialData={initialData}
      teamId={session.user.teamId!}
      enablePitchScore={enablePitchScore}
    />
  );
}
