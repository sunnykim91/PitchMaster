import { auth } from "@/lib/auth";
import BoardClient from "./BoardClient";
import { getBoardData } from "@/lib/server/getBoardData";

export default async function BoardPage() {
  const session = await auth();
  if (!session) return null;
  const initialData = await getBoardData(session.user.teamId!);
  return <BoardClient userId={session.user.id} userRole={session.user.teamRole} initialData={initialData} />;
}
