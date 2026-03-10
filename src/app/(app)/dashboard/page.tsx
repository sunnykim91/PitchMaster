import { auth } from "@/lib/auth";
import DashboardClient from "@/app/(app)/dashboard/DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;
  return <DashboardClient userId={session.user.id} />;
}
