import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import ClientLayout from "@/app/(app)/ClientLayout";

// 인증 필요 페이지 — 정적 프리렌더링 비활성화
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    // 로그인 후 원래 보던 페이지(예: 단톡방에서 받은 투표 링크)로 복귀시키기 위해 경로 보존
    const path = (await headers()).get("x-pathname") || "";
    redirect(path && path !== "/" ? `/login?redirect=${encodeURIComponent(path)}` : "/login");
  }

  if (!session.user.isProfileComplete) {
    redirect("/onboarding");
  }

  if (!session.user.teamId) {
    redirect("/team");
  }

  return <ClientLayout session={session}>{children}</ClientLayout>;
}
