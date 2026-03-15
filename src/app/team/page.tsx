import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import TeamClient from "@/app/team/TeamClient";

export default async function TeamPage() {
  const session = await auth();

  if (!session) redirect("/login");
  if (!session.user.isProfileComplete) redirect("/onboarding");
  if (session.user.teamId) redirect("/dashboard");

  return (
    <Suspense>
      <TeamClient />
    </Suspense>
  );
}
