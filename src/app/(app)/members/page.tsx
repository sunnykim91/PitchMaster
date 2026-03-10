import { auth } from "@/lib/auth";
import MembersClient from "@/app/(app)/members/MembersClient";

export default async function MembersPage() {
  const session = await auth();

  if (!session) {
    return null;
  }

  return (
    <MembersClient
      currentRole={session.user.teamRole}
      currentUserId={session.user.id}
    />
  );
}
