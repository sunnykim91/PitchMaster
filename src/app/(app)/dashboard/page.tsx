import { auth } from "@/lib/auth";
import DashboardClient from "@/app/(app)/dashboard/DashboardClient";
import { getDashboardData } from "@/lib/server/getDashboardData";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;
  const initialData = await getDashboardData(session.user.teamId!, session.user.id);
  return <DashboardClient userId={session.user.id} initialData={initialData} />;
}
