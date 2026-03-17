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
    <Button
      className="h-14 rounded-2xl bg-[#FEE500] px-10 text-base font-bold text-[#1E1E1E]"
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
              실시간 참석투표 · AI 포메이션 · 회비 OCR · 데이터 분석
              <br />
              카카오톡 공유까지 한 곳에서.
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

        {/* 오른쪽: 앱 화면 미리보기 슬라이더 */}
        <div className="w-full max-w-sm flex-shrink-0">
          <AppScreenSlider />
        </div>
      </section>

      {/* ── Section 2: 공감 ── */}
      <section className="relative border-t border-border/30 bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-rose-400">
            이런 경험 있으시죠?
          </p>
          <h2 className="mt-4 font-heading text-3xl font-bold md:text-4xl">
            조기축구 운영,
            <br />
            생각보다 일이 많습니다.
          </h2>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                pain: "참석 인원 파악",
                detail:
                  "카톡에 투표 올려도 읽씹 속출. 결국 총무가 한 명씩 전화해서 확인.",
              },
              {
                pain: "회비 정산",
                detail:
                  "통장 캡쳐하고, 엑셀 열어서 대조하고, 밴드에 올리고... 매달 반복.",
              },
              {
                pain: "포메이션 편성",
                detail:
                  "참석자 몇 명인지도 불확실한데, 포지션 배분은 경기장 가서야 시작.",
              },
            ].map((item) => (
              <Card key={item.pain} className="border-border/30 bg-card/50">
                <CardContent className="p-6">
                  <p className="text-lg font-bold text-foreground">
                    {item.pain}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {item.detail}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 2.5: 실제 화면 미리보기 ── */}
      <section className="relative border-t border-border/30">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
              App Preview
            </p>
            <h2 className="mt-4 font-heading text-3xl font-bold md:text-4xl">
              실제 이렇게 사용해요.
            </h2>
            <p className="mt-3 text-muted-foreground">
              대시보드부터 AI 포메이션까지, 모든 기능을 한 앱에서.
            </p>
          </div>

          {/* Horizontal scroll preview */}
          <div className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            {[
              { label: "대시보드", desc: "다음 경기, 투표 현황, 할 일을 한눈에", color: "border-sky-500/30", bg: "bg-sky-500/5" },
              { label: "경기 일정", desc: "실시간 참석 투표 + 자동 카운트", color: "border-emerald-500/30", bg: "bg-emerald-500/5" },
              { label: "내 기록", desc: "레이더 차트 + 시즌 랭킹 시각화", color: "border-violet-500/30", bg: "bg-violet-500/5" },
              { label: "AI 포메이션", desc: "선호 포지션 분석 → 최적 배치 추천", color: "border-purple-500/30", bg: "bg-purple-500/5" },
              { label: "회비 관리", desc: "통장 OCR + 자동 입출금 정리", color: "border-blue-500/30", bg: "bg-blue-500/5" },
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
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-blue-400">
              Smart Finance
            </p>
            <h2 className="mt-4 font-heading text-3xl font-bold md:text-4xl">
              모임통장 캡쳐 한 장이면 끝.
            </h2>
            <p className="mt-3 text-muted-foreground">
              더 이상 엑셀에 한 줄씩 옮겨 적지 않아도 돼요.
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
                      name: "상대팀FC",
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
                OCR 자동 인식
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

      {/* ── Section 4: 자동 스쿼드 편성 ── */}
      <section className="relative border-t border-border/30 bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-purple-400">
              Auto Squad
            </p>
            <h2 className="mt-4 font-heading text-3xl font-bold md:text-4xl">
              포메이션, 더 이상 머리 아프지 마세요.
            </h2>
            <p className="mt-3 text-muted-foreground">
              참석 인원과 선호 포지션만 있으면, 나머지는 자동입니다.
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
                    "radial-gradient(ellipse at 50% 50%, rgba(34,197,94,0.15) 0%, transparent 70%)",
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
                AI 포메이션 추천 + 드래그 전술판
              </div>
              <h3 className="font-heading text-2xl font-bold">
                AI가 추천하고,<br />
                손가락으로 미세 조정.
              </h3>
              <div className="space-y-3">
                {[
                  "AI가 선수 선호 포지션 분석 → 최적 포메이션 자동 추천",
                  "추천 결과를 전술판에 원클릭 적용 — 바로 수정도 가능",
                  "쿼터별 출전 시간 공평 배분 — 한 명만 계속 뛰는 일 없음",
                  "포메이션 변경해도 선수 배치 유지 — 4-3-3 → 4-4-2 자동 재배치",
                  "완성된 전술판을 이미지로 저장 — 카톡으로 바로 공유",
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
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
              And More
            </p>
            <h2 className="mt-4 font-heading text-3xl font-bold md:text-4xl">
              그 밖에도 다 돼요.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "📡",
                title: "실시간 동기화",
                desc: "참석 투표, 골 기록, MVP 투표가 실시간으로 반영. 새로고침 불필요.",
                color: "text-emerald-400",
              },
              {
                icon: "📊",
                title: "데이터 시각화",
                desc: "레이더 차트로 개인 능력치 분석. 랭킹 바 차트로 팀 내 순위 확인.",
                color: "text-sky-400",
              },
              {
                icon: "🏆",
                title: "경기 기록 & MVP",
                desc: "골, 어시스트, 출석 자동 집계. MVP 투표로 시즌 랭킹이 쌓여요.",
                color: "text-rose-400",
              },
              {
                icon: "💬",
                title: "카카오톡 공유",
                desc: "경기 결과, 투표 링크, 팀 초대를 카카오톡 피드 카드로 공유.",
                color: "text-amber-400",
              },
              {
                icon: "🔔",
                title: "푸시 알림",
                desc: "투표 마감 임박, 새 경기 등록 시 브라우저 푸시 알림으로 안내.",
                color: "text-violet-400",
              },
              {
                icon: "👥",
                title: "팀원 사전등록 & 연동",
                desc: "가입 전 팀원도 미리 등록. 카카오 가입 시 자동 연동.",
                color: "text-cyan-400",
              },
              {
                icon: "💰",
                title: "벌금 관리",
                desc: "벌금 규칙 등록, 부과, 납부 확인까지. 미납 현황도 한눈에.",
                color: "text-orange-400",
              },
              {
                icon: "🔄",
                title: "멀티팀 지원",
                desc: "한 계정으로 여러 팀 운영. A팀 회장이면서 B팀 평회원도 가능.",
                color: "text-teal-400",
              },
              {
                icon: "📱",
                title: "PWA 오프라인 지원",
                desc: "홈 화면에 설치 가능. 오프라인에서도 기본 기능 사용.",
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
                    kakao: "1/2 수동 집계",
                    band: "투표 기능",
                    pm: "자동 집계 + 마감",
                  },
                  {
                    feature: "회비 관리",
                    kakao: "엑셀 / 메모",
                    band: "없음",
                    pm: "OCR 자동 입력",
                  },
                  {
                    feature: "포메이션",
                    kakao: "없음",
                    band: "없음",
                    pm: "자동 편성 + 전술판",
                  },
                  {
                    feature: "경기 기록",
                    kakao: "없음",
                    band: "없음",
                    pm: "골/어시/MVP 자동 집계",
                  },
                  {
                    feature: "팀원 관리",
                    kakao: "채팅방 = 팀원?",
                    band: "멤버 관리",
                    pm: "사전등록 + 자동연동",
                  },
                  {
                    feature: "실시간 동기화",
                    kakao: "없음",
                    band: "없음",
                    pm: "실시간 투표/기록 반영",
                  },
                  {
                    feature: "데이터 분석",
                    kakao: "없음",
                    band: "없음",
                    pm: "레이더/바 차트 시각화",
                  },
                  {
                    feature: "카톡 공유",
                    kakao: "텍스트만",
                    band: "없음",
                    pm: "피드 카드 공유",
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
            이번 주 경기,
            <br />
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
