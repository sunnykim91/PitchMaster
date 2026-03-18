import { auth } from "@/lib/auth";
import DuesClient from "./DuesClient";
import { getDuesData } from "@/lib/server/getDuesData";

export default async function DuesPage() {
  const session = await auth();
  if (!session) return null;
  const initialData = await getDuesData(session.user.teamId!) as unknown as Parameters<typeof DuesClient>[0]["initialData"];
  return <DuesClient userId={session.user.id} userRole={session.user.teamRole} initialData={initialData} />;
}
