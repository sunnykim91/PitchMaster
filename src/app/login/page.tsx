import { Suspense } from "react";
import { isKakaoConfigured } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import DemoButton from "./DemoButton";
import HeroSection from "./sections/HeroSection";
import BeforeAfterSection from "./sections/BeforeAfterSection";
import FeaturesSection from "./sections/FeaturesSection";
import MoreFeaturesSection from "./sections/MoreFeaturesSection";
import ComparisonSection from "./sections/ComparisonSection";
import TestimonialsSection from "./sections/TestimonialsSection";
import HowItWorksSection from "./sections/HowItWorksSection";
import FaqSection from "./sections/FaqSection";
import FinalCtaSection from "./sections/FinalCtaSection";
import FooterSection from "./sections/FooterSection";

const DEMO_TEAM_ID = "192127c0-e2be-46b4-b340-7583730467da";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code: inviteCode } = await searchParams;
  const kakaoEnabled = isKakaoConfigured();
  const kakaoHref = inviteCode
    ? `/api/auth/kakao?inviteCode=${encodeURIComponent(inviteCode)}`
    : "/api/auth/kakao";

  // 실시간 소셜프루프
  let teamCount = 50;
  let memberCount = 375;
  try {
    const db = getSupabaseServer();
    if (db) {
      const [teamsRes, membersRes] = await Promise.all([
        db.from("teams").select("id", { count: "exact", head: true }).neq("id", DEMO_TEAM_ID),
        db.from("team_members").select("user_id", { count: "exact", head: true }).neq("team_id", DEMO_TEAM_ID).eq("status", "ACTIVE"),
      ]);
      if (teamsRes.count != null) teamCount = teamsRes.count;
      if (membersRes.count != null) memberCount = membersRes.count;
    }
  } catch {
    // fallback
  }

  const kakaoIcon = (
    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.724 1.8 5.113 4.508 6.459-.2.732-.722 2.654-.828 3.065-.13.507.186.5.39.364.16-.107 2.554-1.74 3.59-2.448.768.112 1.562.17 2.34.17 5.523 0 10-3.463 10-7.691S17.523 3 12 3" />
    </svg>
  );

  const kakaoButtonClass = "h-14 rounded-2xl bg-[hsl(var(--kakao))] px-10 text-base font-bold text-[hsl(var(--kakao-foreground))] shadow-lg shadow-[hsl(var(--kakao))]/25 transition-all hover:bg-[hsl(var(--kakao))]/90 hover:shadow-xl hover:shadow-[hsl(var(--kakao))]/30 hover:scale-[1.02]";

  const kakaoButton = kakaoEnabled ? (
    <Button className={kakaoButtonClass} asChild>
      <a href={kakaoHref}>{kakaoIcon}카카오로 간편 시작</a>
    </Button>
  ) : (
    <Button className={kakaoButtonClass} disabled>카카오로 시작하기 (환경변수 필요)</Button>
  );

  const kakaoButtonFinal = kakaoEnabled ? (
    <Button className={kakaoButtonClass} asChild>
      <a href={kakaoHref}>{kakaoIcon}무료로 시작하기</a>
    </Button>
  ) : (
    <Button className={kakaoButtonClass} disabled>무료로 시작하기</Button>
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-background pb-20 lg:pb-0">
      <HeroSection
        kakaoButton={kakaoButton}
        demoButton={<Suspense fallback={<div className="h-10" />}><DemoButton /></Suspense>}
        teamCount={teamCount}
        memberCount={memberCount}
      />
      <BeforeAfterSection />
      <FeaturesSection />
      <MoreFeaturesSection />
      <ComparisonSection />
      <TestimonialsSection />
      <HowItWorksSection />
      <FaqSection />
      <FinalCtaSection
        kakaoButton={kakaoButtonFinal}
        demoButton={<Suspense fallback={<div className="h-10" />}><DemoButton /></Suspense>}
      />
      <FooterSection />

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/30 bg-background/80 backdrop-blur-xl p-3 lg:hidden">
        <div className="flex gap-2" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {kakaoEnabled ? (
            <Button className="h-12 flex-1 rounded-xl bg-[hsl(var(--kakao))] text-sm font-bold text-[hsl(var(--kakao-foreground))] shadow-lg shadow-[hsl(var(--kakao))]/25 hover:bg-[hsl(var(--kakao))]/90" asChild>
              <a href={kakaoHref}>무료로 시작</a>
            </Button>
          ) : (
            <Button className="h-12 flex-1 rounded-xl bg-[hsl(var(--kakao))] text-sm font-bold text-[hsl(var(--kakao-foreground))]" disabled>무료로 시작</Button>
          )}
          <Suspense fallback={null}>
            <DemoButton compact />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
