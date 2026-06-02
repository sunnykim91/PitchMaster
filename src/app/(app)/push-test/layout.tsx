import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isStaffOrAbove } from "@/lib/permissions";

/**
 * push-test 는 실제 팀원에게 푸시를 발송하는 운영/디버그 도구.
 * 서버 레벨에서 운영진(STAFF+) 전용으로 게이트 — 일반 회원의 URL 직접 접근 차단.
 */
export default async function PushTestLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isStaffOrAbove(session.user.teamRole)) redirect("/dashboard");
  return <>{children}</>;
}
