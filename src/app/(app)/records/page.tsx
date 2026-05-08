import { auth } from "@/lib/auth";
import RecordsClient from "@/app/(app)/records/RecordsClient";
import { getRecordsData } from "@/lib/server/getRecordsData";

export default async function RecordsPage() {
  const session = await auth();
  if (!session) return null;

  const initialData = await getRecordsData(session.user.teamId!);
  return (
    <RecordsClient
      userId={session.user.id}
      userName={session.user.name ?? "나"}
      userRole={session.user.teamRole}
      initialData={initialData}
    />
  );
}
