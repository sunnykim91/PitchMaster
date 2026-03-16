import { isKakaoConfigured } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code: inviteCode } = await searchParams;
  const kakaoEnabled = isKakaoConfigured();
  const kakaoHref = inviteCode
    ? `/api/auth/kakao?inviteCode=${encodeURIComponent(inviteCode)}`
    : "/api/auth/kakao";

  const kakaoButton = kakaoEnabled ? (
    <Button
      className="h-14 rounded-2xl bg-[#FEE500] px-10 text-base font-bold text-[#1E1E1E] shadow-lg shadow-[#FEE500]/25 transition-all hover:bg-[#FEE500]/90 hover:shadow-xl hover:shadow-[#FEE500]/30"
      asChild
    >
      <a href={kakaoHref}>
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
  );

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* 배경 장식 */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      {/* ── Section 1: Hero ── */}
      <section className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-12 px-6 py-16 lg:flex-row lg:gap-16">
        <div className="flex-1 space-y-8 text-center lg:text-left">
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

          <div className="flex flex-col items-center gap-3 lg:items-start">
            {kakaoButton}
            <p className="text-xs text-muted-foreground">
              별도 회원가입 없이, 카카오 계정으로 바로 시작할 수 있어요.
            </p>
          </div>
        </div>

        {/* 오른쪽 미리보기 */}
        <div className="w-full max-w-sm flex-shrink-0">
          <Card className="border-border/30 bg-card/40 backdrop-blur-md">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="rounded-xl bg-blue-500/10 p-4 text-center">
                  <p className="text-xs text-blue-400/80">통장 잔고</p>
                  <p className="mt-1 font-heading text-2xl font-bold text-blue-300">1,202,592원</p>
                  <p className="mt-1 text-[10px] text-blue-400/50">2026.03.16 기준</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                    <p className="text-[10px] text-emerald-400/80">이번 달 수입</p>
                    <p className="font-bold text-emerald-400">93,000원</p>
                  </div>
                  <div className="rounded-lg bg-rose-500/10 p-3 text-center">
                    <p className="text-[10px] text-rose-400/80">이번 달 지출</p>
                    <p className="font-bold text-rose-400">119,730원</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[
                    { name: "이성규", amount: "-36,000", type: "out" },
                    { name: "양문주", amount: "-79,230", type: "out" },
                    { name: "셀로스FC", amount: "+73,000", type: "in" },
                  ].map((t) => (
                    <div key={t.name} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                      <span className="text-xs font-medium">{t.name}</span>
                      <span className={`text-xs font-bold ${t.type === "in" ? "text-emerald-400" : "text-rose-400"}`}>
                        {t.amount}원
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-[10px] text-muted-foreground">통장 캡쳐 한 장이면 자동 입력</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Section 2: 공감 ── */}
      <section className="relative border-t border-border/30 bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-rose-400">
            이런 경험 있으시죠?
          </p>
          <h2 className="mt-4 font-heading text-3xl font-bold md:text-4xl">
            조기축구 운영,<br />생각보다 일이 많습니다.
          </h2>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                pain: '"이번 주 참석 ㅋㅋ"',
                detail: "카톡에 1/2 달아도 안 읽는 사람, 결국 총무가 한 명씩 연락",
              },
              {
                pain: '"회비 얼마 남았지?"',
                detail: "엑셀 파일 찾아서 열고, 통장 캡쳐 대조하고... 매달 반복",
              },
              {
                pain: '"누가 어디서 뛰지?"',
                detail: "머릿속으로 포메이션 짜다가 빠진 사람 발견. 경기 10분 전 대혼란",
              },
            ].map((item) => (
              <Card key={item.pain} className="border-border/30 bg-card/50">
                <CardContent className="p-6">
                  <p className="text-lg font-bold text-foreground">{item.pain}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: 핵심 기능 ── */}
      <section className="relative border-t border-border/30">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
              Core Features
            </p>
            <h2 className="mt-4 font-heading text-3xl font-bold md:text-4xl">
              이 모든 걸 한 곳에서.
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "📸",
                title: "통장 캡쳐 → 자동 입력",
                desc: "은행 앱 스크린샷만 올리면 AI가 입출금 내역을 자동으로 인식. 날짜, 이름, 금액, 잔고까지 한 번에.",
                tag: "OCR",
                color: "text-blue-400",
              },
              {
                icon: "🧠",
                title: "자동 스쿼드 편성",
                desc: "참석 인원의 선호 포지션을 분석해서 쿼터별 라인업을 자동 생성. 출전 시간도 공평하게 배분.",
                tag: "AI",
                color: "text-purple-400",
              },
              {
                icon: "📋",
                title: "참석 투표 & 마감",
                desc: "일정 등록하면 투표가 자동 오픈. 마감 시간 지나면 참석 확정. 운영진이 대리 투표도 가능.",
                color: "text-emerald-400",
              },
              {
                icon: "⚽",
                title: "전술판 & 포메이션",
                desc: "드래그로 선수 배치. 포메이션 변경해도 배치 유지. 완성된 라인업을 이미지로 공유.",
                color: "text-amber-400",
              },
              {
                icon: "🏆",
                title: "경기 기록 & MVP",
                desc: "골, 어시스트, 출석 자동 집계. 경기 끝나면 MVP 투표. 시즌 랭킹이 자동으로 쌓여요.",
                color: "text-rose-400",
              },
              {
                icon: "👥",
                title: "팀원 사전등록 & 연동",
                desc: "아직 가입 안 한 팀원도 미리 등록. 나중에 카카오로 가입하면 자동으로 연동.",
                color: "text-cyan-400",
              },
            ].map((item) => (
              <Card key={item.title} className="group border-border/30 bg-card/50 transition-all hover:border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{item.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${item.color}`}>{item.title}</p>
                        {item.tag && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                            {item.tag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: 비교표 ── */}
      <section className="relative border-t border-border/30 bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400">
              Comparison
            </p>
            <h2 className="mt-4 font-heading text-3xl font-bold md:text-4xl">
              아직도 카톡방으로 운영하세요?
            </h2>
          </div>

          <div className="mt-12 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="pb-4 text-left text-muted-foreground font-medium">기능</th>
                  <th className="pb-4 text-center text-muted-foreground font-medium">카톡 단체방</th>
                  <th className="pb-4 text-center text-muted-foreground font-medium">네이버 밴드</th>
                  <th className="pb-4 text-center font-bold text-primary">PitchMaster</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {[
                  { feature: "참석 투표", kakao: "1/2 수동 집계", band: "투표 기능", pm: "자동 집계 + 마감" },
                  { feature: "회비 관리", kakao: "엑셀 / 메모", band: "없음", pm: "OCR 자동 입력" },
                  { feature: "포메이션", kakao: "없음", band: "없음", pm: "자동 편성 + 전술판" },
                  { feature: "경기 기록", kakao: "없음", band: "없음", pm: "골/어시/MVP 자동 집계" },
                  { feature: "팀원 관리", kakao: "채팅방 = 팀원?", band: "멤버 관리", pm: "사전등록 + 자동연동" },
                  { feature: "멀티팀", kakao: "방 여러 개", band: "밴드 여러 개", pm: "한 계정으로 팀 전환" },
                ].map((row) => (
                  <tr key={row.feature}>
                    <td className="py-3 font-medium text-foreground">{row.feature}</td>
                    <td className="py-3 text-center text-muted-foreground">{row.kakao}</td>
                    <td className="py-3 text-center text-muted-foreground">{row.band}</td>
                    <td className="py-3 text-center font-semibold text-primary">{row.pm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section 5: 이용 방법 ── */}
      <section className="relative border-t border-border/30">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-400">
              How it works
            </p>
            <h2 className="mt-4 font-heading text-3xl font-bold md:text-4xl">
              시작은 3초면 충분해요.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "카카오로 로그인",
                desc: "별도 회원가입 없이 카카오 계정으로 바로 시작",
              },
              {
                step: "02",
                title: "팀 만들기 or 초대코드 입력",
                desc: "새 팀을 만들거나, 기존 팀의 초대 링크로 바로 합류",
              },
              {
                step: "03",
                title: "운영 시작",
                desc: "경기 일정 잡고, 투표 받고, 포메이션 짜고, 회비 관리까지",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <span className="font-heading text-xl font-bold text-primary">{item.step}</span>
                </div>
                <p className="mt-4 text-base font-bold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: CTA ── */}
      <section className="relative border-t border-border/30 bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="font-heading text-3xl font-bold md:text-4xl">
            이번 주말 경기,<br />
            <span className="text-primary">PitchMaster로 준비해보세요.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            무료로 시작할 수 있어요. 팀원 초대도 링크 하나면 끝.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            {kakaoButton}
            <p className="text-xs text-muted-foreground">
              무료 · 광고 없음 · 카카오 계정으로 바로 시작
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/30 py-8 text-center text-xs text-muted-foreground/50">
        PitchMaster &copy; {new Date().getFullYear()}
      </footer>
    </main>
  );
}
