import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import OnboardingClient from "@/app/onboarding/OnboardingClient";
import type { SportType } from "@/lib/types";

// TEMP: 디자인 검토용 preview 모드 — 김선휘만 ?preview=1로 진입 가능. 작업 종료 후 제거.
const DESIGN_PREVIEW_USER_ID = "7bc8a1b2-7844-41f3-b592-05a2c38f8085";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; preview?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const isDesignPreview =
    (params.preview === "1" || params.preview === "2") &&
    session.user.id === DESIGN_PREVIEW_USER_ID;

  if (session.user.isProfileComplete && !isDesignPreview) {
    redirect("/team");
  }

  // 초대코드가 있으면 해당 팀의 스포츠 타입 조회
  // preview=2는 풋살 모드 강제 (디자인 검토용)
  let sportType: SportType = params.preview === "2" ? "FUTSAL" : "SOCCER";
  if (params.code) {
    const db = getSupabaseAdmin();
    if (db) {
      const { data: team } = await db
        .from("teams")
        .select("sport_type")
        .eq("invite_code", params.code.toUpperCase())
        .single();
      if (team?.sport_type === "FUTSAL") sportType = "FUTSAL";
    }
  }

  return (
    <OnboardingClient
      isFutsal={sportType === "FUTSAL"}
      inviteCode={params.code}
      errorMsg={params.error}
      isDesignPreview={isDesignPreview}
    />
  );
}
