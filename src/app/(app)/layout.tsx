import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ClientLayout from "@/app/(app)/ClientLayout";

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
