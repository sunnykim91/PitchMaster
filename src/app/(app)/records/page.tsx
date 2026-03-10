import { auth } from "@/lib/auth";
import RecordsClient from "@/app/(app)/records/RecordsClient";

export default async function RecordsPage() {
  const session = await auth();
  if (!session) return null;
  return <RecordsClient userId={session.user.id} userRole={session.user.teamRole} />;
}
