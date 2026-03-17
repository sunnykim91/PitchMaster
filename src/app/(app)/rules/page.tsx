import { auth } from "@/lib/auth";
import RulesClient from "@/app/(app)/rules/RulesClient";
import { getRulesData } from "@/lib/server/getRulesData";

export default async function RulesPage() {
  const session = await auth();
  if (!session) return null;
  const initialData = await getRulesData(session.user.teamId!);
  return <RulesClient userRole={session.user.teamRole} initialData={initialData} />;
}
