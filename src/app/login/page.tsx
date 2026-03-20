import { isKakaoConfigured } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AppScreenSlider from "./AppScreenSlider";

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

  const kakaoButton = kakaoEnabled ? (
    <Button
      className="h-14 rounded-2xl bg-[hsl(var(--kakao))] px-10 text-base font-bold text-[hsl(var(--kakao-foreground))] shadow-lg shadow-[hsl(var(--kakao))]/25 transition-all hover:bg-[hsl(var(--kakao))]/90 hover:shadow-xl hover:shadow-[hsl(var(--kakao))]/30"
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
    <Button
      className="h-14 rounded-2xl bg-[hsl(var(--kakao))] px-10 text-base font-bold text-[hsl(var(--kakao-foreground))]"
      disabled
    >
      카카오로 시작하기 (환경변수 필요)
    </Button>
  );

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* 배경 장식 */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      {/* ── Section 1: Hero ── */}
      <section className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-12 px-6 py-16 lg:flex-row lg:gap-16">
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="inline-block rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-primary">
            PitchMaster
          </div>

          <h1 className="font-heading text-4xl font-bold leading-tight md:text-5xl lg:text-[3.5rem]">
            총무님,
            <br />
            <span className="text-primary">아직도 카톡으로 운영하세요?</span>
          </h1>

          <div className="mx-auto max-w-md space-y-2 lg:mx-0">
            <p className="text-lg text-muted-foreground">
              읽씹 없는 참석투표 · 캡쳐 한 장이면 끝나는 회비정산
              <br />
              원탭 득점 기록 · 경기장 가기 전에 완성되는 AI 라인업
            </p>
            <p className="text-lg font-semibold text-foreground">
              조기축구 · 풋살 팀 운영, 이제 여기서 끝내세요.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 lg:items-start">
            {kakaoButton}
            <p className="text-xs text-muted-foreground">
              무료 · 광고 없음 · 1분이면 팀 세팅 완료
            </p>
            <p className="text-[11px] text-muted-foreground/60">
              현재 37명 규모 팀이 3개월째 사용 중
            </p>
          </div>
        </div>

        {/* 오른쪽: 앱 화면 미리보기 슬라이더 (모바일에서는 CTA 아래) */}
        <div className="w-full max-w-sm flex-shrink-0">
          <AppScreenSlider />
        </div>
      </section>

      {/* ── Stats Counter ── */}
      <section className="relative border-t border-border/30 bg-primary/5">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 px-6 py-8 md:gap-16">
          {[
            { value: "100+", label: "관리된 경기", color: "text-primary" },
            { value: "1,500+", label: "참석 투표", color: "text-sky-400" },
            { value: "37", label: "팀 멤버", color: "text-violet-400" },
            { value: "4개월+", label: "운영 기간", color: "text-amber-400" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={`font-heading text-2xl font-bold md:text-3xl ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: 공감 ── */}
      <section className="relative border-t border-border/30 bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-rose-400">
            총무의 현실
          </p>
          <h2 className="mt-4 font-heading text-3xl font-bold md:text-4xl">
            매주 반복되는 이 루틴,
            <br />
            지치지 않으셨나요?
          </h2>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* 참석 확인 */}
            <div className="rounded-2xl bg-[#b2c7d9]/10 p-5">
              <p className="text-sm font-bold text-foreground mb-4">📋 참석 인원 파악</p>
              <div className="space-y-2.5">
                <div className="flex justify-end"><span className="rounded-2xl rounded-tr-sm bg-[hsl(var(--kakao))] px-3 py-2 text-xs text-[hsl(var(--kakao-foreground))]">이번주 토요일 참석 가능한 분~?</span></div>
                <div className="flex justify-start"><span className="rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2 text-xs text-foreground/70">🙋‍♂️</span></div>
                <div className="flex items-center justify-start gap-2">
                  <span className="rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2 text-xs text-foreground/70">저 갈 수 있어요</span>
                  <span className="text-[10px] text-muted-foreground/40">읽음 25</span>
                </div>
                <div className="flex justify-end"><span className="rounded-2xl rounded-tr-sm bg-[hsl(var(--kakao))] px-3 py-2 text-xs text-[hsl(var(--kakao-foreground))]">답 안한 사람 15명인데... 🙏</span></div>
                <div className="flex justify-end"><span className="rounded-2xl rounded-tr-sm bg-[hsl(var(--kakao))] px-3 py-2 text-xs text-[hsl(var(--kakao-foreground))]">금요일까지 답 부탁!!</span></div>
              </div>
              <p className="mt-4 text-xs font-semibold text-rose-400">→ 결국 금요일 밤에 한 명씩 전화...</p>
            </div>

            {/* 회비 정산 */}
            <div className="rounded-2xl bg-[#b2c7d9]/10 p-5">
              <p className="text-sm font-bold text-foreground mb-4">💰 회비 정산</p>
              <div className="space-y-2.5">
                <div className="flex justify-end"><span className="rounded-2xl rounded-tr-sm bg-[hsl(var(--kakao))] px-3 py-2 text-xs text-[hsl(var(--kakao-foreground))]">3월 회비 정산입니다</span></div>
                <div className="flex justify-end"><span className="rounded-2xl rounded-tr-sm bg-[hsl(var(--kakao))] px-3 py-2 text-xs text-[hsl(var(--kakao-foreground))]">📷 통장캡쳐.jpg</span></div>
                <div className="flex items-center justify-start gap-2">
                  <span className="rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2 text-xs text-foreground/70">저 지난주에 보냈는데요?</span>
                  <span className="text-[10px] text-muted-foreground/40">읽음 18</span>
                </div>
                <div className="flex justify-start"><span className="rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2 text-xs text-foreground/70">저도 입금했어요 확인 좀 ㅠ</span></div>
              </div>
              <p className="mt-4 text-xs font-semibold text-rose-400">→ 엑셀 열어서 30분 동안 대조...</p>
            </div>

            {/* 선수 배치 */}
            <div className="rounded-2xl bg-[#b2c7d9]/10 p-5">
              <p className="text-sm font-bold text-foreground mb-4">⚽ 선수 배치</p>
              <div className="space-y-2.5">
                <div className="flex justify-end"><span className="rounded-2xl rounded-tr-sm bg-[hsl(var(--kakao))] px-3 py-2 text-xs text-[hsl(var(--kakao-foreground))]">내일 몇 명 오는 거야?</span></div>
                <div className="flex items-center justify-start gap-2">
                  <span className="rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2 text-xs text-foreground/70">아직 답 안 한 사람 많은데ㅋㅋ</span>
                  <span className="text-[10px] text-muted-foreground/40">읽음 22</span>
                </div>
                <div className="flex justify-end"><span className="rounded-2xl rounded-tr-sm bg-[hsl(var(--kakao))] px-3 py-2 text-xs text-[hsl(var(--kakao-foreground))]">포지션은 가서 정하자...</span></div>
                <div className="flex justify-start"><span className="rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2 text-xs text-foreground/70">ㅇㅇ 매번 그러잖아 ㅋ</span></div>
              </div>
              <p className="mt-4 text-xs font-semibold text-rose-400">→ 경기장 도착해서야 라인업 시작...</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2.5: 실제 화면 미리보기 ── */}
      <section className="relative border-t border-border/30">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold md:text-4xl">
              총무가 필요한 건 다 있습니다.
            </h2>
            <p className="mt-3 text-muted-foreground">
              카톡 + 엑셀 + 현장 라인업, 세 가지를 한 곳에서.
            </p>
          </div>

          {/* Horizontal scroll preview */}
          <div className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            {[
              { label: "대시보드", desc: "다음 경기, 투표 현황, 팀 전적을 한눈에", color: "border-sky-500/30", bg: "bg-sky-500/5" },
              { label: "경기 일정", desc: "실시간 투표 + 승/무/패 스코어 표시", color: "border-primary/30", bg: "bg-primary/5" },
              { label: "팀 전적", desc: "승/무/패 · 득실차 · 최근 5경기 기록", color: "border-rose-500/30", bg: "bg-rose-500/5" },
              { label: "내 기록", desc: "레이더 차트 + 시즌 랭킹 시각화", color: "border-violet-500/30", bg: "bg-violet-500/5" },
              { label: "AI 라인업", desc: "선호 포지션 분석 → 자동 추천 + 심판/촬영 배정", color: "border-purple-500/30", bg: "bg-purple-500/5" },
              { label: "회비 관리", desc: "통장 캡쳐 한 장이면 입출금 자동 정리", color: "border-blue-500/30", bg: "bg-blue-500/5" },
              { label: "게시판", desc: "사진 업로드 + 수정/삭제 자유", color: "border-pink-500/30", bg: "bg-pink-500/5" },
              { label: "카카오 공유", desc: "경기 결과 · 투표 링크 카드 공유", color: "border-amber-500/30", bg: "bg-amber-500/5" },
            ].map((item) => (
              <Card
                key={item.label}
                className={`min-w-[220px] snap-center border ${item.color} ${item.bg} flex-shrink-0 transition-transform hover:scale-[1.02]`}
              >
                <CardContent className="p-5">
                  <p className="text-sm font-bold text-foreground">{item.label}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: 회비 관리 (모임통장 OCR) ── */}
      <section className="relative border-t border-border/30">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold md:text-4xl">
              통장 캡쳐 한 장이면<br />이번 달 회비 정산 끝.
            </h2>
            <p className="mt-3 text-muted-foreground">
              엑셀 열고 한 줄씩 대조하던 그 시간, 이제 돌려받으세요.
            </p>
          </div>

          <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
            {/* 왼쪽: 모임통장 캡쳐 모형 */}
            <Card className="mx-auto w-full max-w-xs overflow-hidden border-border/30 bg-[#1A1A1A]">
              <CardContent className="p-0">
                <div className="bg-[#1A1A1A] px-5 py-4">
                  <p className="text-center text-xs text-white/50">모임통장</p>
                  <p className="mt-2 text-center font-heading text-2xl font-bold text-white">
                    1,202,592원
                  </p>
                </div>
                <div className="space-y-0 bg-[#222]">
                  {[
                    {
                      date: "03.16",
                      name: "김OO",
                      time: "15:54",
                      amount: "-36,000원",
                      balance: "1,202,592원",
                      color: "text-white",
                    },
                    {
                      date: "03.12",
                      name: "박OO",
                      time: "10:05",
                      amount: "-79,230원",
                      balance: "1,238,592원",
                      color: "text-white",
                    },
                    {
                      date: "03.11",
                      name: "블루윙FC",
                      time: "11:23",
                      amount: "+73,000원",
                      balance: "1,317,822원",
                      color: "text-[#4A9DFF]",
                    },
                    {
                      date: "03.10",
                      name: "이OO",
                      time: "22:30",
                      amount: "+10,000원",
                      balance: "1,244,822원",
                      color: "text-[#4A9DFF]",
                    },
                  ].map((t, i) => (
                    <div key={i} className="border-t border-white/5 px-5 py-3">
                      <p className="text-[10px] text-white/30">{t.date}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-white/80">
                            {t.name}
                          </p>
                          <p className="text-[10px] text-white/30">{t.time}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-bold ${t.color}`}>
                            {t.amount}
                          </p>
                          <p className="text-[10px] text-white/30">
                            {t.balance}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 오른쪽: 설명 */}
            <div className="space-y-6">
              <div className="inline-block rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">
                캡쳐 한 장이면 끝
              </div>
              <h3 className="font-heading text-2xl font-bold">
                스크린샷 업로드 한 번이면
                <br />
                날짜, 이름, 금액, 잔고까지.
              </h3>
              <div className="space-y-3">
                {[
                  "카카오뱅크, 토스 등 모임통장 캡쳐 지원",
                  "날짜 · 입금자 · 금액 · 잔고 자동 추출",
                  "중복 내역 자동 감지 — 같은 캡쳐 올려도 중복 등록 없음",
                  "팀원 이름 자동 매칭 — 누가 입금했는지 바로 연결",
                ].map((text) => (
                  <div key={text} className="flex items-start gap-2">
                    <span className="mt-0.5 text-sm text-blue-400">✓</span>
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: AI 선수 배치 ── */}
      <section className="relative border-t border-border/30 bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold md:text-4xl">
              경기장 도착 전에<br />라인업이 완성됩니다.
            </h2>
            <p className="mt-3 text-muted-foreground">
              &ldquo;오늘 누가 어디서 뛰어?&rdquo; 이제 안 물어봐도 됩니다.
            </p>
          </div>

          <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
            {/* 전술판 — 실제 TacticsBoard 동일 스타일 */}
            <div className="mx-auto w-full max-w-sm rounded-2xl p-3" style={{ backgroundColor: "#0a0e14" }}>
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-bold text-white">1쿼터 · 4-3-3</span>
                <span className="text-xs text-white/50">PitchMaster</span>
              </div>
              <div
                className="relative mt-3 aspect-4/5 w-full overflow-hidden rounded-2xl border-2 border-white/10 shadow-xl shadow-black/30"
                style={{
                  background: "#1a6b32",
                  backgroundImage: [
                    "repeating-linear-gradient(180deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 38px, rgba(255,255,255,0.06) 38px, rgba(255,255,255,0.06) 76px)",
                    "repeating-linear-gradient(90deg, rgba(0,0,0,0.02) 0px, transparent 2px, transparent 4px)",
                    "radial-gradient(ellipse at 50% 50%, hsl(16 85% 58% / 0.15) 0%, transparent 70%)",
                  ].join(", "),
                }}
              >
                {/* 경기장 라인 */}
                <div className="absolute inset-3 rounded-sm border-2 border-white/30" />
                <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-px bg-white/30" />
                <div className="absolute left-1/2 top-1/2 h-[18%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
                <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
                <div className="absolute inset-x-[20%] top-3 h-[16%] border-2 border-t-0 border-white/30" />
                <div className="absolute inset-x-[32%] top-3 h-[8%] border-2 border-t-0 border-white/30" />
                <div className="absolute left-1/2 top-[18.5%] h-[6%] w-[16%] -translate-x-1/2 rounded-b-full border-2 border-t-0 border-white/30" />
                <div className="absolute inset-x-[20%] bottom-3 h-[16%] border-2 border-b-0 border-white/30" />
                <div className="absolute inset-x-[32%] bottom-3 h-[8%] border-2 border-b-0 border-white/30" />
                <div className="absolute left-1/2 bottom-[18.5%] h-[6%] w-[16%] -translate-x-1/2 rounded-t-full border-2 border-b-0 border-white/30" />
                <div className="absolute left-3 top-3 h-4 w-4 rounded-br-full border-b-2 border-r-2 border-white/30" />
                <div className="absolute right-3 top-3 h-4 w-4 rounded-bl-full border-b-2 border-l-2 border-white/30" />
                <div className="absolute bottom-3 left-3 h-4 w-4 rounded-tr-full border-r-2 border-t-2 border-white/30" />
                <div className="absolute bottom-3 right-3 h-4 w-4 rounded-tl-full border-l-2 border-t-2 border-white/30" />

                {/* 4-3-3 선수 배치 (formations.ts 실제 좌표) */}
                {[
                  { label: "GK", x: 50, y: 92 },
                  { label: "김OO", x: 16, y: 74 },
                  { label: "박OO", x: 38, y: 76 },
                  { label: "이OO", x: 62, y: 76 },
                  { label: "최OO", x: 84, y: 74 },
                  { label: "정OO", x: 35, y: 54 },
                  { label: "한OO", x: 50, y: 50 },
                  { label: "윤OO", x: 65, y: 54 },
                  { label: "서OO", x: 22, y: 26 },
                  { label: "장OO", x: 50, y: 22 },
                  { label: "조OO", x: 78, y: 26 },
                ].map((p, i) => (
                  <div
                    key={i}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  >
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-lg"
                      style={{ backgroundColor: "#2563eb" }}
                    >
                      {p.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 설명 */}
            <div className="space-y-6">
              <div className="inline-block rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400">
                AI 자동 배치 + 드래그 전술판
              </div>
              <h3 className="font-heading text-2xl font-bold">
                AI가 배치하고,<br />
                손가락으로 미세 조정.
              </h3>
              <div className="space-y-3">
                {[
                  "AI가 선호 포지션 분석해서 누가 어디서 뛸지 자동 추천",
                  "추천 결과를 전술판에 원클릭 적용 — 바로 수정도 가능",
                  "쿼터별 출전 횟수 실시간 표시 — 공평하게 분배",
                  "쉬는 선수 중 심판 · 촬영 역할 배정까지 한 화면에서",
                  "완성된 전술판을 이미지로 저장 — 쉬는 선수/심판/촬영 포함",
                ].map((text) => (
                  <div key={text} className="flex items-start gap-2">
                    <span className="mt-0.5 text-sm text-purple-400">✓</span>
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: 기타 기능 ── */}
      <section className="relative border-t border-border/30">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold md:text-4xl">
              팀 운영에 필요한 것, 더 있습니다.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "📡",
                title: "실시간 동기화",
                desc: "참석 투표, 골 기록, MVP 투표가 실시간 반영. 새로고침 불필요.",
                color: "text-primary",
              },
              {
                icon: "📊",
                title: "팀 전적 & 데이터 분석",
                desc: "승/무/패, 득실차, 최근 5경기. 레이더 차트로 개인 능력치까지.",
                color: "text-sky-400",
              },
              {
                icon: "⚽",
                title: "간편 득점 기록",
                desc: "스코어보드에서 +득점, +실점 버튼 한 번이면 끝. 상세 기록은 선택.",
                color: "text-primary",
              },
              {
                icon: "🏟️",
                title: "축구 & 풋살 모두 지원",
                desc: "팀 생성 시 선택하면 인원수, 쿼터, 포메이션이 자동으로.",
                color: "text-primary",
              },
              {
                icon: "💬",
                title: "카카오톡 공유",
                desc: "경기 결과, 투표 링크, 팀 초대를 카카오톡 카드로 공유.",
                color: "text-amber-400",
              },
              {
                icon: "👥",
                title: "멀티팀 · 사전등록",
                desc: "한 계정으로 여러 팀. 가입 전 팀원도 미리 등록 + 자동 연동.",
                color: "text-cyan-400",
              },
              {
                icon: "📱",
                title: "앱처럼 설치 가능",
                desc: "홈 화면에 추가하면 앱처럼. 오프라인에서도 기본 기능 OK.",
                color: "text-indigo-400",
              },
            ].map((item) => (
              <Card
                key={item.title}
                className="group border-border/30 bg-card/50 transition-all hover:border-primary/20"
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <p className={`text-sm font-bold ${item.color}`}>
                      {item.title}
                    </p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section: 사용자 후기 ── */}
      <section className="relative border-t border-border/30">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold md:text-4xl">
              실제 사용 후기
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "김총무",
                role: "조기축구 총무 3년차",
                quote: "매주 금요일마다 카톡방에서 참석 확인하느라 30분씩 쓰던 게, 이제 링크 하나 보내면 끝이에요. 진짜 인생이 바뀌었습니다.",
                highlight: "참석 확인 30분 → 링크 하나",
              },
              {
                name: "박회장",
                role: "풋살팀 회장",
                quote: "통장 캡쳐 올리면 회비가 자동으로 정리되는 거 보고 소름 돋았어요. 엑셀 안 열어본 지 2달 됐습니다.",
                highlight: "엑셀 안 연 지 2달",
              },
              {
                name: "이매니저",
                role: "30명 팀 운영",
                quote: "AI가 포지션 배치까지 해주니까 경기장 가기 전에 라인업이 다 짜여있어요. 카톡으로 전술판 공유하면 다들 좋아합니다.",
                highlight: "경기 전에 라인업 완성",
              },
            ].map((review) => (
              <Card key={review.name} className="border-border/30 bg-card/50">
                <CardContent className="p-6">
                  <p className="text-sm leading-relaxed text-foreground/80">
                    &ldquo;{review.quote}&rdquo;
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {review.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{review.name}</p>
                      <p className="text-xs text-muted-foreground">{review.role}</p>
                    </div>
                  </div>
                  <p className="mt-3 rounded-full bg-primary/10 px-3 py-1 text-center text-xs font-bold text-primary">
                    {review.highlight}
                  </p>
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
            <h2 className="font-heading text-3xl font-bold md:text-4xl">
              아직도 카톡방으로 운영하세요?
            </h2>
          </div>

          <div className="table-scroll-container mt-12 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="pb-4 text-left text-muted-foreground font-medium">
                    기능
                  </th>
                  <th className="pb-4 text-center text-muted-foreground font-medium">
                    카톡 단체방
                  </th>
                  <th className="pb-4 text-center text-muted-foreground font-medium">
                    네이버 밴드
                  </th>
                  <th className="pb-4 text-center font-bold text-primary">
                    PitchMaster
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {[
                  {
                    feature: "참석 투표",
                    kakao: "수동 집계",
                    band: "투표 기능",
                    pm: "실시간 자동 집계",
                  },
                  {
                    feature: "회비 관리",
                    kakao: "엑셀 / 메모",
                    band: "없음",
                    pm: "통장 캡쳐 자동 입력",
                  },
                  {
                    feature: "선수 배치",
                    kakao: "없음",
                    band: "없음",
                    pm: "AI 자동 배치 + 전술판",
                  },
                  {
                    feature: "경기 기록 · 전적",
                    kakao: "없음",
                    band: "없음",
                    pm: "골/어시/MVP + 승무패 자동",
                  },
                  {
                    feature: "데이터 분석",
                    kakao: "없음",
                    band: "없음",
                    pm: "레이더 차트 + 랭킹",
                  },
                  {
                    feature: "득점 기록",
                    kakao: "없음",
                    band: "없음",
                    pm: "원탭 스코어보드 + 상세 기록",
                  },
                  {
                    feature: "멀티팀",
                    kakao: "방 여러 개",
                    band: "밴드 여러 개",
                    pm: "한 계정으로 팀 전환",
                  },
                ].map((row) => (
                  <tr key={row.feature}>
                    <td className="py-3 font-medium text-foreground">
                      {row.feature}
                    </td>
                    <td className="py-3 text-center text-muted-foreground">
                      {row.kakao}
                    </td>
                    <td className="py-3 text-center text-muted-foreground">
                      {row.band}
                    </td>
                    <td className="py-3 text-center font-semibold text-primary">
                      {row.pm}
                    </td>
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
            <h2 className="font-heading text-3xl font-bold md:text-4xl">
              세팅은 1분이면 끝납니다.
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
                desc: "경기 일정 등록 → 참석 투표 → AI 라인업 → 원탭 득점 기록까지",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <span className="font-heading text-xl font-bold text-primary">
                    {item.step}
                  </span>
                </div>
                <p className="mt-4 text-base font-bold text-foreground">
                  {item.title}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: CTA ── */}
      <section className="relative border-t border-border/30 bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="font-heading text-3xl font-bold md:text-4xl">
            이번 주부터 카톡 대신
            <br />
            <span className="text-primary">PitchMaster로 운영해보세요.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            현재 무료. 팀원 초대도 링크 하나면 끝입니다.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            {kakaoButton}
            <p className="text-xs text-muted-foreground">
              무료 · 광고 없음 · 카카오 계정으로 바로 시작
            </p>
          </div>
        </div>
      </section>

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/30 bg-background/95 p-3 backdrop-blur-sm lg:hidden">
        <Button
          className="h-12 w-full rounded-xl bg-[hsl(var(--kakao))] text-sm font-bold text-[hsl(var(--kakao-foreground))] shadow-lg shadow-[hsl(var(--kakao))]/25 hover:bg-[hsl(var(--kakao))]/90"
          asChild
        >
          <a href={kakaoEnabled ? (inviteCode ? `/api/auth/kakao?inviteCode=${encodeURIComponent(inviteCode)}` : "/api/auth/kakao") : "#"}>
            카카오로 무료 시작하기
          </a>
        </Button>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-border/30 py-8 pb-24 lg:pb-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-6">
          <div className="flex gap-4 text-xs text-muted-foreground/60">
            <a href="/privacy" className="transition hover:text-foreground">개인정보처리방침</a>
            <span>·</span>
            <a href="/terms" className="transition hover:text-foreground">이용약관</a>
          </div>
          <p className="text-xs text-muted-foreground/40">
            PitchMaster &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </main>
  );
}
