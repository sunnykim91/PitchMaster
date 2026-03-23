import { Suspense } from "react";
import { isKakaoConfigured } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AppScreenSlider from "./AppScreenSlider";
import ScrollRevealInit from "./ScrollRevealInit";
import DemoButton from "./DemoButton";

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

  const kakaoIcon = (
    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.724 1.8 5.113 4.508 6.459-.2.732-.722 2.654-.828 3.065-.13.507.186.5.39.364.16-.107 2.554-1.74 3.59-2.448.768.112 1.562.17 2.34.17 5.523 0 10-3.463 10-7.691S17.523 3 12 3" />
    </svg>
  );

  const kakaoButtonBase = "h-14 rounded-2xl bg-[hsl(var(--kakao))] px-10 text-base font-bold text-[hsl(var(--kakao-foreground))] shadow-lg shadow-[hsl(var(--kakao))]/25 transition-all hover:bg-[hsl(var(--kakao))]/90 hover:shadow-xl hover:shadow-[hsl(var(--kakao))]/30";

  const disabledKakaoButton = (
    <Button
      className="h-14 rounded-2xl bg-[hsl(var(--kakao))] px-10 text-base font-bold text-[hsl(var(--kakao-foreground))]"
      disabled
    >
      카카오로 시작하기 (환경변수 필요)
    </Button>
  );

  /** 1st CTA (hero) */
  const kakaoButton = kakaoEnabled ? (
    <Button className={kakaoButtonBase} asChild>
      <a href={kakaoHref}>{kakaoIcon}카카오로 간편 시작</a>
    </Button>
  ) : disabledKakaoButton;

  /** 2nd CTA (after before/after) */
  const kakaoButton2 = kakaoEnabled ? (
    <Button className={kakaoButtonBase} asChild>
      <a href={kakaoHref}>{kakaoIcon}지금 바로 시작하기</a>
    </Button>
  ) : disabledKakaoButton;

  /** 3rd CTA (final section) */
  const kakaoButton3 = kakaoEnabled ? (
    <Button className={kakaoButtonBase} asChild>
      <a href={kakaoHref}>{kakaoIcon}무료로 시작하기</a>
    </Button>
  ) : disabledKakaoButton;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <ScrollRevealInit />
      {/* 배경 장식 */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      {/* ── Section 1: Hero ── */}
      <section aria-label="서비스 소개" className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-12 px-4 py-16 sm:px-6 lg:flex-row lg:gap-16">
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="inline-block rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-primary">
            PitchMaster
          </div>

          <h1 className="break-keep font-heading text-2xl font-bold leading-tight sm:text-3xl md:text-4xl lg:text-[3.5rem]">
            총무님,
            <br />
            <span className="text-primary">아직도 카톡으로 운영하세요?</span>
          </h1>

          <div className="mx-auto max-w-md space-y-3 lg:mx-0">
            <p className="break-keep text-sm text-muted-foreground sm:text-base">
              참석 투표 · 회비 관리 · 자동 포지션 배치
              <br />
              <span className="font-semibold text-foreground">한 곳에서, 한 번에.</span>
            </p>
            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">참석 확인 30분 → 30초</span>
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">회비 정산 30분 → 1분</span>
              <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400">라인업 20분 → 3초</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 lg:items-start">
            {kakaoButton}
            <Suspense fallback={<div className="h-10" />}>
              <DemoButton />
            </Suspense>
            <p className="text-xs text-muted-foreground">
              무료 · 광고 없음 · 1분이면 팀 세팅 완료
            </p>
          </div>
        </div>

        {/* 오른쪽: 앱 화면 미리보기 슬라이더 */}
        <div className="w-full max-w-sm flex-shrink-0">
          <AppScreenSlider />
        </div>
      </section>

      {/* ── Stats Counter ── */}
      <section aria-label="사용 통계" className="scroll-reveal relative border-t border-border/30 bg-primary/5">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 px-6 py-8 md:gap-16">
          {[
            { value: "5개 팀", label: "등록 팀", color: "text-primary" },
            { value: "100+", label: "등록 회원", color: "text-sky-400" },
            { value: "200+", label: "관리된 경기", color: "text-violet-400" },
            { value: "6개월+", label: "운영 기간", color: "text-amber-400" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={`font-heading text-xl font-bold sm:text-2xl md:text-3xl ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Before / After ── */}
      <section aria-label="기능 비교" className="scroll-reveal relative border-t border-border/30 bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-rose-400">
            총무의 현실
          </p>
          <h2 className="mt-4 break-keep font-heading text-2xl font-bold sm:text-3xl md:text-4xl">
            이렇게 바뀝니다.
          </h2>

          <div className="mt-10 grid gap-6 sm:mt-12 md:grid-cols-3">
            {[
              {
                icon: "📱",
                before: { title: "참석 확인", pain: "카톡에 물어보고, 읽씹, 금요일에 전화" },
                after: { title: "실시간 투표", solution: "링크 하나 → 자동 집계", time: "30초" },
              },
              {
                icon: "💳",
                before: { title: "회비 정산", pain: "통장 캡쳐 → 엑셀 → 대조 30분" },
                after: { title: "자동 정리", solution: "캡쳐 올리면 자동 인식", time: "1분" },
              },
              {
                icon: "⚽",
                before: { title: "선수 배치", pain: "경기장 도착해서야 포지션 정함" },
                after: { title: "AI 라인업", solution: "선호 포지션 기반 자동 배치", time: "3초" },
              },
            ].map((item) => (
              <div
                key={item.before.title}
                className="overflow-hidden rounded-2xl border border-border/30"
              >
                {/* Before */}
                <div className="bg-rose-500/10 p-4 sm:p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-400">
                    Before
                  </p>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    {item.before.title}
                  </p>
                  <p className="mt-1 break-keep text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {item.before.pain}
                  </p>
                </div>
                {/* Divider arrow */}
                <div className="flex items-center justify-center bg-border/10 py-1">
                  <span className="text-lg text-muted-foreground">↓</span>
                </div>
                {/* After */}
                <div className="bg-emerald-500/10 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      After
                    </p>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
                      {item.after.time}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-foreground">
                    {item.after.title}
                  </p>
                  <p className="mt-1 break-keep text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {item.after.solution}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 미니 CTA */}
          <div className="mt-10 flex flex-col items-center gap-3">
            {kakaoButton2}
            <Suspense fallback={<div className="h-10" />}>
              <DemoButton />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ── Section 3: Core 3 Features ── */}
      <section aria-label="핵심 기능" className="scroll-reveal relative border-t border-border/30">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center">
            <h2 className="break-keep font-heading text-2xl font-bold sm:text-3xl md:text-4xl">
              핵심 기능
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              총무가 매주 하는 일, 세 가지로 끝.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:mt-12 md:grid-cols-3">
            {/* 투표 */}
            <Card className="border-border/30 bg-card/50 transition-all hover:border-primary/20">
              <CardContent className="p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lg">
                  📋
                </div>
                <p className="mt-3 text-sm font-bold text-primary">참석 투표</p>
                <p className="mt-1 break-keep text-xs text-muted-foreground">
                  링크 하나면 끝
                </p>
                <ul className="mt-3 space-y-1.5">
                  {[
                    "실시간 참석/불참 자동 집계",
                    "마감 시간 설정 가능",
                    "읽씹 걱정 제로",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="mt-0.5 text-primary">✓</span>
                      <span className="break-keep">{t}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* 회비 */}
            <Card className="border-border/30 bg-card/50 transition-all hover:border-blue-400/20">
              <CardContent className="p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-lg">
                  💰
                </div>
                <p className="mt-3 text-sm font-bold text-blue-400">회비 정산</p>
                <p className="mt-1 break-keep text-xs text-muted-foreground">
                  캡쳐 한 장이면 끝
                </p>
                <ul className="mt-3 space-y-1.5">
                  {[
                    "이름·금액·날짜 자동 인식",
                    "중복 내역 자동 감지",
                    "팀원 이름 자동 매칭",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="mt-0.5 text-blue-400">✓</span>
                      <span className="break-keep">{t}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* 라인업 */}
            <Card className="border-border/30 bg-card/50 transition-all hover:border-purple-400/20">
              <CardContent className="p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-lg">
                  🧠
                </div>
                <p className="mt-3 text-sm font-bold text-purple-400">AI 라인업</p>
                <p className="mt-1 break-keep text-xs text-muted-foreground">
                  버튼 한 번이면 끝
                </p>
                <ul className="mt-3 space-y-1.5">
                  {[
                    "선호 포지션 기반 자동 배치",
                    "쿼터별 출전 횟수 균등 분배",
                    "전술판 이미지 저장·공유",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="mt-0.5 text-purple-400">✓</span>
                      <span className="break-keep">{t}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Mini tactical board */}
          <div className="mx-auto mt-10 w-full max-w-xs rounded-2xl p-2" style={{ backgroundColor: "#0a0e14" }}>
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-white">1쿼터 · 4-3-3</span>
              <span className="text-xs text-white/50">PitchMaster</span>
            </div>
            <div
              className="relative mt-2 aspect-[4/5] w-full overflow-hidden rounded-xl border-2 border-white/10 shadow-xl shadow-black/30"
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

              {/* 4-3-3 선수 배치 */}
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
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg sm:h-10 sm:w-10 sm:text-xs"
                    style={{ backgroundColor: "#2563eb" }}
                  >
                    {p.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: More Features (8 cards) ── */}
      <section aria-label="추가 기능" className="scroll-reveal relative border-t border-border/30 bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center">
            <h2 className="break-keep font-heading text-2xl font-bold sm:text-3xl md:text-4xl">
              이것만이 아닙니다.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">팀 운영에 필요한 모든 것이 여기에.</p>
          </div>

          <div className="mt-10 grid gap-4 grid-cols-2 sm:mt-12 md:grid-cols-4">
            {[
              {
                icon: "⚽",
                title: "원탭 득점 기록",
                desc: "쿼터별 스코어보드로 득점·어시스트 즉시 기록",
                color: "text-primary",
              },
              {
                icon: "📊",
                title: "시즌 통계 & 랭킹",
                desc: "승률, 출석률, 레이더 차트, 개인별 랭킹",
                color: "text-sky-400",
              },
              {
                icon: "🏆",
                title: "MVP 투표",
                desc: "경기 후 팀원이 직접 뽑는 MVP",
                color: "text-amber-400",
              },
              {
                icon: "📋",
                title: "팀 게시판",
                desc: "공지사항, 자유글, 투표까지 팀 전용 소통 공간",
                color: "text-violet-400",
              },
              {
                icon: "🔔",
                title: "푸시 알림",
                desc: "경기 등록·투표 마감 알림을 앱처럼 받기",
                color: "text-rose-400",
              },
              {
                icon: "📜",
                title: "회칙 관리",
                desc: "팀 규정을 앱에서 관리, 파일 첨부 가능",
                color: "text-emerald-400",
              },
              {
                icon: "🏟️",
                title: "축구 & 풋살",
                desc: "종목별 인원·쿼터·포메이션 자동 설정",
                color: "text-primary",
              },
              {
                icon: "👀",
                title: "데모 체험",
                desc: "회원가입 없이 모든 기능을 바로 둘러보기",
                color: "text-sky-400",
              },
            ].map((item) => (
              <Card
                key={item.title}
                className="group border-border/30 bg-card/50 transition-all hover:border-primary/20"
              >
                <CardContent className="p-4 sm:p-5">
                  <span className="text-xl sm:text-2xl">{item.icon}</span>
                  <p className={`mt-2 text-xs font-bold sm:text-sm ${item.color}`}>
                    {item.title}
                  </p>
                  <p className="mt-1 break-keep text-xs leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: 비교표 ── */}
      <section aria-label="서비스 비교" className="scroll-reveal relative border-t border-border/30">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center">
            <h2 className="break-keep font-heading text-2xl font-bold sm:text-3xl md:text-4xl">
              아직도 카톡방으로 운영하세요?
            </h2>
          </div>

          <div className="table-scroll-container mt-10 overflow-x-auto sm:mt-12">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th scope="col" className="pb-3 text-left text-muted-foreground font-medium sm:pb-4">
                    기능
                  </th>
                  <th scope="col" className="pb-3 text-center text-muted-foreground font-medium sm:pb-4">
                    카톡
                  </th>
                  <th scope="col" className="pb-3 text-center text-muted-foreground font-medium sm:pb-4">
                    밴드
                  </th>
                  <th scope="col" className="pb-3 text-center font-bold text-primary sm:pb-4">
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
                    pm: "캡쳐 자동 입력",
                  },
                  {
                    feature: "선수 배치",
                    kakao: "없음",
                    band: "없음",
                    pm: "AI 배치 + 전술판",
                  },
                  {
                    feature: "경기 기록",
                    kakao: "없음",
                    band: "없음",
                    pm: "골/어시/MVP 자동",
                  },
                  {
                    feature: "데이터 분석",
                    kakao: "없음",
                    band: "없음",
                    pm: "레이더 차트 + 랭킹",
                  },
                  {
                    feature: "게시판 / 공지",
                    kakao: "공지 묻힘",
                    band: "게시판",
                    pm: "고정 공지 + 투표",
                  },
                  {
                    feature: "푸시 알림",
                    kakao: "없음",
                    band: "앱 알림",
                    pm: "투표 마감 자동 알림",
                  },
                  {
                    feature: "데모 체험",
                    kakao: "없음",
                    band: "없음",
                    pm: "가입 없이 둘러보기",
                  },
                  {
                    feature: "멀티팀",
                    kakao: "방 여러 개",
                    band: "밴드 여러 개",
                    pm: "한 계정 전환",
                  },
                ].map((row) => (
                  <tr key={row.feature} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 font-medium text-foreground sm:py-3">
                      {row.feature}
                    </td>
                    <td className="py-2.5 text-center text-muted-foreground/60 sm:py-3">
                      {row.kakao}
                    </td>
                    <td className="py-2.5 text-center text-muted-foreground/60 sm:py-3">
                      {row.band}
                    </td>
                    <td className="py-2.5 text-center font-semibold text-emerald-400 sm:py-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-xs">✓</span> {row.pm}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section 6: 사용자 후기 ── */}
      <section aria-label="사용자 후기" className="scroll-reveal relative border-t border-border/30 bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center">
            <h2 className="break-keep font-heading text-2xl font-bold sm:text-3xl md:text-4xl">
              실제 사용 후기
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:mt-12 md:grid-cols-3">
            {[
              {
                name: "K총무",
                role: "조기축구 총무 4년차 · 25명 팀",
                quote: "매주 금요일 저녁마다 한 명씩 전화하던 게, 링크 하나 보내고 끝이에요. 진짜 인생 바뀜.",
                highlight: "전화 25통 → 링크 1개",
                stars: 5,
              },
              {
                name: "P회장",
                role: "평일 풋살팀 회장 · 18명",
                quote: "통장 캡쳐 올렸더니 회비가 자동으로 정리되더라고요. 엑셀 파일 삭제했습니다.",
                highlight: "엑셀 삭제 완료",
                stars: 5,
              },
              {
                name: "L운영진",
                role: "주말 축구팀 · 35명 운영",
                quote: "경기장 도착 전에 라인업이 카톡으로 공유되니까 다들 좋아해요. 특히 쿼터별 균등 배분이 공정해서.",
                highlight: "라인업 갈등 해소",
                stars: 5,
              },
            ].map((review) => (
              <Card key={review.name} className="border-border/30 bg-card/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: review.stars }, (_, i) => (
                      <span key={i} className="text-sm">★</span>
                    ))}
                  </div>
                  <p className="mt-2 break-keep text-xs leading-relaxed text-foreground/80 sm:text-sm">
                    &ldquo;{review.quote}&rdquo;
                  </p>
                  <div className="mt-3 flex items-center gap-3 sm:mt-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary sm:h-9 sm:w-9 sm:text-sm">
                      {review.name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground sm:text-sm">{review.name}</p>
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

      {/* ── Section 7: 이용 방법 ── */}
      <section aria-label="이용 방법" className="scroll-reveal relative border-t border-border/30">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center">
            <h2 className="break-keep font-heading text-2xl font-bold sm:text-3xl md:text-4xl">
              세팅은 1분이면 끝납니다.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 sm:mt-12 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "카카오로 로그인",
                desc: "별도 회원가입 없이 바로 시작",
              },
              {
                step: "02",
                title: "팀 만들기 or 초대코드",
                desc: "새 팀을 만들거나 초대 링크로 합류",
              },
              {
                step: "03",
                title: "운영 시작",
                desc: "일정 등록 → 투표 → AI 라인업 → 득점 기록",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 sm:h-14 sm:w-14">
                  <span className="font-heading text-lg font-bold text-primary sm:text-xl">
                    {item.step}
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold text-foreground sm:mt-4 sm:text-base">
                  {item.title}
                </p>
                <p className="mt-1 break-keep text-xs text-muted-foreground sm:mt-2 sm:text-sm">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 8: CTA ── */}
      <section aria-label="시작하기" className="scroll-reveal relative border-t border-border/30 bg-gradient-to-b from-primary/5 via-primary/10 to-transparent backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <h2 className="break-keep font-heading text-2xl font-bold sm:text-3xl md:text-4xl">
            이번 주부터 카톡 대신
            <br />
            <span className="text-primary">PitchMaster로 운영해보세요.</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
            현재 무료. 팀원 초대도 링크 하나면 끝.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8">
            {kakaoButton3}
            <Suspense fallback={<div className="h-10" />}>
              <DemoButton />
            </Suspense>
            <p className="text-xs text-muted-foreground">
              무료 · 광고 없음 · 카카오 계정으로 바로 시작
            </p>
          </div>
        </div>
      </section>

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/30 bg-background/95 p-3 backdrop-blur-sm lg:hidden">
        <div className="flex gap-2">
          <Button
            className="h-12 flex-1 rounded-xl bg-[hsl(var(--kakao))] text-sm font-bold text-[hsl(var(--kakao-foreground))] shadow-lg shadow-[hsl(var(--kakao))]/25 hover:bg-[hsl(var(--kakao))]/90"
            asChild
          >
            <a href={kakaoEnabled ? (inviteCode ? `/api/auth/kakao?inviteCode=${encodeURIComponent(inviteCode)}` : "/api/auth/kakao") : "#"}>
              무료로 시작
            </a>
          </Button>
          <Suspense fallback={null}>
            <DemoButton compact />
          </Suspense>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer aria-label="사이트 정보" className="border-t border-border/30 py-8 pb-24 lg:pb-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-6">
          <div className="flex gap-4 text-xs text-muted-foreground/60">
            <a href="/privacy" className="transition hover:text-foreground">개인정보처리방침</a>
            <span>·</span>
            <a href="/terms" className="transition hover:text-foreground">이용약관</a>
          </div>
          <p className="text-xs text-muted-foreground">
            데이터는 한국 리전(서울)에 안전하게 저장됩니다
          </p>
          <p className="text-xs text-muted-foreground">
            문의: pitchmaster.app@gmail.com
          </p>
          <p className="text-xs text-muted-foreground/40">
            PitchMaster &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </main>
  );
}
