import { isKakaoConfigured } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const kakaoEnabled = isKakaoConfigured();

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* 배경 장식 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-12 px-6 py-16 lg:flex-row lg:gap-16">
        {/* 왼쪽: 메인 카피 */}
        <section className="flex-1 space-y-8 text-center lg:text-left">
          <div className="inline-block rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-primary">
            PitchMaster
          </div>

          <h1 className="font-heading text-4xl font-bold leading-tight md:text-5xl lg:text-[3.5rem]">
            우리 팀 운영,
            <br />
            <span className="text-primary">이제 톡방 말고 여기서.</span>
          </h1>

          <p className="mx-auto max-w-md text-lg text-muted-foreground lg:mx-0">
            경기 잡고, 출석 받고, 회비 정리하고, 누가 골 넣었는지까지.
            <br className="hidden md:block" />
            조기축구 팀 운영에 필요한 모든 것, 한곳에서 끝.
          </p>

          {/* 카카오 로그인 버튼 - 크게 강조 */}
          <div className="flex flex-col items-center gap-3 lg:items-start">
            {kakaoEnabled ? (
              <Button
                className="h-14 rounded-2xl bg-[#FEE500] px-10 text-base font-bold text-[#1E1E1E] shadow-lg shadow-[#FEE500]/25 transition-all hover:bg-[#FEE500]/90 hover:shadow-xl hover:shadow-[#FEE500]/30"
                asChild
              >
                <a href="/api/auth/kakao">
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.724 1.8 5.113 4.508 6.459-.2.732-.722 2.654-.828 3.065-.13.507.186.5.39.364.16-.107 2.554-1.74 3.59-2.448.768.112 1.562.17 2.34.17 5.523 0 10-3.463 10-7.691S17.523 3 12 3" />
                  </svg>
                  카카오로 3초 만에 시작
                </a>
              </Button>
            ) : (
              <Button className="h-14 rounded-2xl bg-[#FEE500] px-10 text-base font-bold text-[#1E1E1E]" disabled>
                카카오로 시작하기 (환경변수 필요)
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              별도 회원가입 없이, 카카오 계정으로 바로 시작할 수 있어요.
            </p>
          </div>
        </section>

        {/* 오른쪽: 기능 카드 */}
        <div className="w-full max-w-sm flex-shrink-0 space-y-4">
          {[
            {
              emoji: "\u26BD",
              title: "경기 일정 & 출석",
              desc: "경기 잡으면 자동 투표 오픈. 누가 오는지 한눈에 확인.",
            },
            {
              emoji: "\uD83E\uDDE0",
              title: "전술판 & 포메이션",
              desc: "드래그로 포지션 배치. 쿼터별 라인업도 한 번에.",
            },
            {
              emoji: "\uD83D\uDCB0",
              title: "회비 투명 관리",
              desc: "얼마 걷고, 어디 썼는지. 팀원 모두가 바로 확인.",
            },
            {
              emoji: "\uD83C\uDFC6",
              title: "기록 & MVP",
              desc: "골, 어시스트, MVP 투표까지. 시즌 통계도 자동 정리.",
            },
          ].map((item) => (
            <Card
              key={item.title}
              className="group border-border/50 bg-card/60 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card/80"
            >
              <CardContent className="flex items-start gap-4 p-5">
                <span className="mt-0.5 text-2xl">{item.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}

          <p className="text-center text-xs text-muted-foreground">
            이미 100+ 팀이 사용 중
          </p>
        </div>
      </div>
    </main>
  );
}
