import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import TeamClient from "@/app/team/TeamClient";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const session = await auth();
  const { code } = await searchParams;
  const codeParam = code ? `?code=${encodeURIComponent(code)}` : "";

  if (!session) redirect(`/login${codeParam}`);
  if (!session.user.isProfileComplete) redirect(`/onboarding${codeParam}`);
  return (
    <Suspense>
      <TeamClient hasExistingTeam={!!session.user.teamId} />
    </Suspense>
  );
}
