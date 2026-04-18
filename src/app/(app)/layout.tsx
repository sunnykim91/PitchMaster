import { redirect } from "next/navigation";
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
    redirect("/login");
  }

  if (!session.user.isProfileComplete) {
    redirect("/onboarding");
  }

  if (!session.user.teamId) {
    redirect("/team");
  }

  return <ClientLayout session={session}>{children}</ClientLayout>;
}
