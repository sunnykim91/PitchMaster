import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isStaffOrAbove } from "@/lib/permissions";
import MonthlyReportClient from "./MonthlyReportClient";

export const metadata = {
  title: "월별 결산 | PitchMaster",
  description: "월별 팀 재무·경기·출석 리포트",
};

export default async function MonthlyReportPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.teamId) redirect("/team");
  // 재무 정보 포함 → 운영진(STAFF+) 만 접근
  if (!isStaffOrAbove(session.user.teamRole)) redirect("/dues");

  return (
    <MonthlyReportClient
      teamName={session.user.teamName ?? "우리 팀"}
    />
  );
}
