import { auth } from "@/lib/auth";
import MembersClient from "./MembersClient";
import { getMembersData } from "@/lib/server/getMembersData";

export default async function MembersPage() {
  const session = await auth();
  if (!session) return null;
  const initialData = await getMembersData(session.user.teamId!, session.user.teamRole);
  // PitchScore Feature Flag — 검증 단계 (37차 메모 기준 김선휘 한정)
  const enablePitchScore = session.user.name === "김선휘";
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
