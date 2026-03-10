import { auth } from "@/lib/auth";
import DuesClient from "@/app/(app)/dues/DuesClient";

export default async function DuesPage() {
  const session = await auth();
  if (!session) return null;
  return <DuesClient userRole={session.user.teamRole} />;
}
