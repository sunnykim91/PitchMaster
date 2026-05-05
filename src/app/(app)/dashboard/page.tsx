import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import DashboardClient from "@/app/(app)/dashboard/DashboardClient";
import { getDashboardData } from "@/lib/server/getDashboardData";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SportType } from "@/lib/playerAttributes/types";

export const metadata: Metadata = {
  title: "대시보드 — PitchMaster",
  description: "팀 경기 일정, 투표 현황, 팀 전적을 한눈에 확인하세요.",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  // PitchScore Phase 2C 동료 평가 — 김선휘만 (라이브 검증 단계). 검증 완료 후 전체 오픈.
  const enablePitchScore = session.user.name === "김선휘";

  // 김선휘일 때만 sport_type fetch — task 노출 + Dialog 진입에 필요
  let sportType: SportType | null = null;
  if (enablePitchScore && session.user.teamId) {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb
        .from("teams")
        .select("sport_type")
        .eq("id", session.user.teamId)
        .maybeSingle();
      const raw = data?.sport_type;
      if (raw === "SOCCER" || raw === "FUTSAL") sportType = raw;
    }
  }

  const initialData = await getDashboardData(session.user.teamId!, session.user.id, enablePitchScore);

  return (
    <DashboardClient
      userId={session.user.id}
      userRole={session.user.teamRole}
      inviteCode={session.user.inviteCode ?? ""}
      teamName={session.user.teamName ?? ""}
      teamId={session.user.teamId ?? ""}
      initialData={initialData}
      sportType={sportType}
    />
  );
}
