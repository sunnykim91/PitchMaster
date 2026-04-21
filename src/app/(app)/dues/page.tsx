import { auth } from "@/lib/auth";
import DuesClient from "./DuesClient";
import { getDuesData } from "@/lib/server/getDuesData";

export default async function DuesPage() {
  const session = await auth();
  if (!session) return null;
  const initialData = await getDuesData(session.user.teamId!) as unknown as Parameters<typeof DuesClient>[0]["initialData"];
  // AI OCR 전체 공개. rate limit(user 20/team 100 per day) + 이미지 해시 캐시로 비용 안전권.
  const enableAi = true;
  return <DuesClient userId={session.user.id} userRole={session.user.teamRole} initialData={initialData} enableAi={enableAi} />;
}
