import { auth } from "@/lib/auth";
import BoardClient from "@/app/(app)/board/BoardClient";

export default async function BoardPage() {
  const session = await auth();
  if (!session) return null;
  return <BoardClient userId={session.user.id} userName={session.user.name} />;
}
