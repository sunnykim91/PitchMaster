import { auth } from "@/lib/auth";
import RulesClient from "@/app/(app)/rules/RulesClient";

export default async function RulesPage() {
  const session = await auth();
  if (!session) return null;
  return <RulesClient userRole={session.user.teamRole} />;
}
