import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { isStaffOrAbove } from "@/lib/permissions";
import AnimationsListClient from "./AnimationsListClient";

export const metadata: Metadata = {
  title: "전술 애니메이션 — PitchMaster",
};

export default async function AnimationsListPage() {
  const session = await auth();
  if (!session) return null;

  if (!isStaffOrAbove(session.user.teamRole)) return notFound();

  return (
    <AnimationsListClient
      teamId={session.user.teamId ?? ""}
      teamName={session.user.teamName ?? "우리 팀"}
    />
  );
}
