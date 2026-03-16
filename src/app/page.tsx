import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home({ searchParams }: { searchParams: Promise<{ inviteCode?: string }> }) {
  const session = await auth();
  const { inviteCode } = await searchParams;
  const codeParam = inviteCode ? `?code=${encodeURIComponent(inviteCode)}` : "";

  if (!session) {
    redirect(`/login${codeParam}`);
  }

  if (!session.user.isProfileComplete) {
    redirect(`/onboarding${codeParam}`);
  }

  if (!session.user.teamId) {
    redirect(`/team${codeParam}`);
  }

  redirect("/dashboard");
}
