import { auth } from "@/lib/auth";
import MembersClient from "./MembersClient";
import { getMembersData } from "@/lib/server/getMembersData";

export default async function MembersPage() {
  const session = await auth();
  if (!session) return null;
  const initialData = await getMembersData(session.user.teamId!, session.user.teamRole);
  return <MembersClient userRole={session.user.teamRole} userId={session.user.id} initialData={initialData} />;
}
