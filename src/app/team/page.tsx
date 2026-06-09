import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import TeamClient from "@/app/team/TeamClient";

// TEMP: 디자인 검토용 preview 모드 — 김선휘만 ?preview=1로 신규가입자 팀선택 화면 진입 가능.
// (이미 팀이 있어도 "이미 멤버" 배너 대신 fresh 화면을 보여줌. 제출은 TeamClient에서 비활성.)
const DESIGN_PREVIEW_USER_ID = "7bc8a1b2-7844-41f3-b592-05a2c38f8085";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; preview?: string }>;
}) {
  const session = await auth();
  const { code, preview } = await searchParams;
  const codeParam = code ? `?code=${encodeURIComponent(code)}` : "";

  if (!session) redirect(`/login${codeParam}`);
  if (!session.user.isProfileComplete) redirect(`/onboarding${codeParam}`);

  const isPreview = preview === "1" && session.user.id === DESIGN_PREVIEW_USER_ID;

  return (
    <Suspense>
      <TeamClient
        hasExistingTeam={isPreview ? false : !!session.user.teamId}
        currentTeamName={session.user.teamName ?? ""}
        isPreview={isPreview}
      />
    </Suspense>
  );
}
