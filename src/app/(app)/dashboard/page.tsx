import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import DashboardClient from "@/app/(app)/dashboard/DashboardClient";
import { getDashboardData } from "@/lib/server/getDashboardData";

export const metadata: Metadata = {
  title: "대시보드 — PitchMaster",
  description: "팀 경기 일정, 투표 현황, 팀 전적을 한눈에 확인하세요.",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;
  const initialData = await getDashboardData(session.user.teamId!, session.user.id);
  return (
    <DashboardClient
      userId={session.user.id}
      userRole={session.user.teamRole}
      inviteCode={session.user.inviteCode ?? ""}
      teamName={session.user.teamName ?? ""}
      initialData={initialData}
    />
  );
}
