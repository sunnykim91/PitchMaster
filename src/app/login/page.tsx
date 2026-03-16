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

          <div className="mx-auto max-w-md space-y-2 lg:mx-0">
            <p className="text-lg text-muted-foreground">
              일정관리 · 투표 · 회비자동정리 · 경기기록
              <br />
              자동으로 스쿼드 짜주는 기능까지
            </p>
            <p className="text-lg font-semibold text-foreground">
              조기축구 운영에 관한 모든 것.
            </p>
          </div>

          {/* 카카오 로그인 버튼 */}
          <div className="flex flex-col items-center gap-3 lg:items-start">
            {kakaoEnabled ? (
              <Button
                className="h-14 rounded-2xl bg-[#FEE500] px-10 text-base font-bold text-[#1E1E1E] shadow-lg shadow-[#FEE500]/25 transition-all hover:bg-[#FEE500]/90 hover:shadow-xl hover:shadow-[#FEE500]/30"
                asChild
              >
                <a href="/api/auth/kakao">
                  <svg
                    className="mr-2 h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.724 1.8 5.113 4.508 6.459-.2.732-.722 2.654-.828 3.065-.13.507.186.5.39.364.16-.107 2.554-1.74 3.59-2.448.768.112 1.562.17 2.34.17 5.523 0 10-3.463 10-7.691S17.523 3 12 3" />
                  </svg>
                  카카오로 3초 만에 시작
                </a>
              </Button>
            ) : (
              <Button
                className="h-14 rounded-2xl bg-[#FEE500] px-10 text-base font-bold text-[#1E1E1E]"
                disabled
              >
                카카오로 시작하기 (환경변수 필요)
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              별도 회원가입 없이, 카카오 계정으로 바로 시작할 수 있어요.
            </p>
          </div>
        </section>

        {/* 오른쪽: 차별점 카드 */}
        <div className="w-full max-w-sm flex-shrink-0 space-y-4">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-primary lg:text-left">
            왜 PitchMaster인가요?
          </p>

          {[
            {
              emoji: "\uD83E\uDDE0",
              title: "버튼 하나로 자동 스쿼드 편성",
              desc: "선호 포지션 기반으로 쿼터별 라인업을 자동 생성. 출전 시간도 공평하게 배분해줘요.",
              tag: "핵심 기능",
            },
            {
              emoji: "\uD83D\uDCCB",
              title: "경기 잡으면 바로 출석 투표",
              desc: "일정 등록과 동시에 참석 투표 오픈. 마감 시간 자동 설정으로 번거로움 없이.",
            },
            {
              emoji: "\uD83D\uDCB0",
              title: "회비, 이제 엑셀 말고 여기서",
              desc: "수입/지출 한눈에 정리. 팀원 누구나 실시간으로 확인할 수 있어 투명해요.",
            },
            {
              emoji: "\u26BD",
              title: "전술판에서 드래그로 배치",
              desc: "포메이션 변경해도 선수 배치가 유지돼요. 라인업 이미지를 카톡으로 바로 공유도.",
            },
            {
              emoji: "\uD83C\uDFC6",
              title: "골·어시스트·MVP 자동 집계",
              desc: "경기 끝나면 기록 남기고 MVP 투표. 시즌 랭킹이 알아서 쌓여요.",
            },
          ].map((item) => (
            <Card
              key={item.title}
              className="group border-border/50 bg-card/60 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card/80"
            >
              <CardContent className="flex items-start gap-4 p-5">
                <span className="mt-0.5 text-2xl">{item.emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">
                      {item.title}
                    </p>
                    {"tag" in item && item.tag && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {item.tag}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
