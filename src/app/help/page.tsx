import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import HelpToc from "./HelpToc";

const TITLE = "PitchMaster 사용법 가이드 — 출석·회비·전술·AI 한 곳에서";
const DESCRIPTION =
  "출석 투표·회비 OCR·AI 라인업·전술 영상·경기 기록 사용법을 한 곳에서. 가입부터 시즌 관리까지 PitchMaster 전 기능 매뉴얼.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://pitch-master.app/help" },
  openGraph: {
    type: "article",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://pitch-master.app/help",
    siteName: "PitchMaster",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// ── 인라인 헬퍼 컴포넌트 ──

function Badge({ variant }: { variant: "president" | "staff" | "member" }) {
  const styles = {
    president: "bg-[hsl(var(--primary)_/_0.15)] text-primary",
    staff: "bg-[hsl(var(--info)_/_0.15)] text-[hsl(var(--info))]",
    member: "bg-secondary text-muted-foreground",
  };
  const labels = { president: "회장", staff: "운영진", member: "회원" };
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold align-middle ${styles[variant]}`}
    >
      {labels[variant]}
    </span>
  );
}

function StepFlow({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 my-3">
      {steps.map((step, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="rounded border border-border bg-[hsl(var(--secondary)_/_0.4)] px-2.5 py-1 text-xs font-medium text-foreground">
            {step}
          </span>
          {i < steps.length - 1 && (
            <span className="text-muted-foreground text-xs">→</span>
          )}
        </span>
      ))}
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 border-l-[3px] border-primary pl-4 text-sm text-muted-foreground leading-relaxed">
      {children}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-10">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs font-bold uppercase tracking-widest text-primary whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl lg:max-w-6xl px-5 py-8 sm:py-12">
        {/* 백링크 */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          홈으로
        </Link>

        {/* PC(≥lg): 좌측 sticky 목차 사이드바 + 본문 2단. 모바일은 단일 컬럼 + 상단 그리드 TOC */}
        <div className="mt-6 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12 xl:gap-16">
          <HelpToc className="hidden lg:block" />

          <div className="min-w-0 lg:max-w-3xl">
        {/* 헤더 */}
        <header className="mb-8 border-b border-border/40 pb-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            GUIDE
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-foreground">
            PitchMaster 사용법 가이드
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {DESCRIPTION}
          </p>
        </header>

        {/* 앵커 TOC — 모바일 전용 (PC는 좌측 사이드바 HelpToc 사용) */}
        <nav aria-label="목차" className="mb-10 lg:hidden">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            바로가기
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["#start", "1. 가입하기"],
              ["#team", "2. 팀 만들기 · 초대"],
              ["#match-flow", "3. 경기 운영 흐름"],
              ["#vote", "4. 참석 투표"],
              ["#attendance", "5. 출석 체크"],
              ["#lineup", "6. 전술 편성"],
              ["#tactics-video", "7. 전술 영상"],
              ["#record", "8. 경기 기록 · 통계"],
              ["#dues", "9. 회비 관리"],
              ["#prepay", "10. 회비 선납"],
              ["#monthly", "11. 월별 결산"],
              ["#ai", "12. AI·자동화 기능"],
              ["#more", "13. 게시판 · 멤버 외"],
              ["#pwa", "14. 홈 화면 추가"],
              ["#faq", "15. FAQ"],
              ["#contact", "16. 문의 · 피드백"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="block rounded-xl border border-border/60 bg-[hsl(var(--secondary)_/_0.2)] px-4 py-3 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-[hsl(var(--secondary)_/_0.4)] transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </nav>

        {/* 역할별 추천 코스 */}
        <div className="rounded-xl border border-border/60 bg-[hsl(var(--secondary)_/_0.2)] p-5 mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            역할별 추천 코스
          </p>
          <div className="divide-y divide-border/40">
            <div className="flex items-baseline gap-3 py-2.5 text-sm">
              <span className="shrink-0 w-14">
                <Badge variant="president" />
              </span>
              <span className="text-muted-foreground">
                <a href="#start" className="text-primary hover:underline">가입</a>
                {" · "}
                <a href="#team" className="text-primary hover:underline">팀 만들기</a>
                {" · "}
                <a href="#match-flow" className="text-primary hover:underline">권한</a>
                {" · "}
                <a href="#dues" className="text-primary hover:underline">회비</a>
                {" · "}
                <a href="#more" className="text-primary hover:underline">시즌</a>
              </span>
            </div>
            <div className="flex items-baseline gap-3 py-2.5 text-sm">
              <span className="shrink-0 w-14">
                <Badge variant="staff" />
              </span>
              <span className="text-muted-foreground">
                <a href="#vote" className="text-primary hover:underline">투표</a>
                {" · "}
                <a href="#attendance" className="text-primary hover:underline">출석</a>
                {" · "}
                <a href="#lineup" className="text-primary hover:underline">전술</a>
                {" · "}
                <a href="#tactics-video" className="text-primary hover:underline">전술 영상</a>
                {" · "}
                <a href="#record" className="text-primary hover:underline">기록</a>
                {" · "}
                <a href="#dues" className="text-primary hover:underline">회비</a>
                {" · "}
                <a href="#ai" className="text-primary hover:underline">AI</a>
              </span>
            </div>
            <div className="flex items-baseline gap-3 py-2.5 text-sm">
              <span className="shrink-0 w-14">
                <Badge variant="member" />
              </span>
              <span className="text-muted-foreground">
                <a href="#start" className="text-primary hover:underline">가입</a>
                {" · "}
                <a href="#vote" className="text-primary hover:underline">참석 투표</a>
                {" · "}
                <a href="#record" className="text-primary hover:underline">MVP</a>
                {" · "}
                <a href="#notif" className="text-primary hover:underline">알림</a>
                {" · "}
                <a href="#pwa" className="text-primary hover:underline">홈 화면 추가</a>
              </span>
            </div>
          </div>
        </div>

        {/* ══════════════ 시작하기 ══════════════ */}
        <SectionDivider label="시작하기" />

        <section id="start" className="scroll-mt-16 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold border-b border-border/40 pb-3 mb-5">
            <span className="text-primary font-black mr-2">1</span>가입하기
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
            별도 회원가입·앱 설치 없이 <strong className="text-foreground">카카오톡 계정</strong>만 있으면 시작할 수 있어요. 실제로 처음부터 끝까지 30초쯤 걸립니다.
          </p>

          <h3 className="text-base font-semibold mb-3 mt-6">가입 순서</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>주소창에 <strong className="text-foreground">pitch-master.app</strong>을 직접 치거나, 회장·총무가 단톡방에 던진 <strong className="text-foreground">초대 링크</strong>를 누르면 시작 화면이 떠요.</li>
            <li>화면에 보이는 <strong className="text-foreground">[무료로 시작하기]</strong> 버튼을 누르면 카카오 로그인 창으로 넘어갑니다.</li>
            <li>로그인이 끝나면 <strong className="text-foreground">이름·프로필을 입력하는 화면</strong>이 떠요. <strong className="text-foreground">이름</strong>만 채워도 다음 단계로 넘어갈 수 있고, 생년월일·주발·선호 포지션은 나중에 설정에서 채워도 됩니다.</li>
            <li>마지막으로 <strong className="text-foreground">[새 팀 만들기]</strong> 또는 <strong className="text-foreground">[팀 검색해서 신청]</strong> 둘 중 하나를 고르면 가입 끝. 초대 링크로 들어왔다면 이 단계가 자동으로 건너뛰어지고 그 팀에 바로 합류돼요.</li>
          </ol>

          <Tip>
            가입하기 전에 한 번 둘러보고 싶다면 메인 화면의 <strong className="text-foreground">[30초 만에 데모 체험하기]</strong> 버튼을 눌러보세요. 가짜 팀(FC DEMO)의 회장으로 들어가 모든 기능을 만져볼 수 있고, 가입은 안 해도 됩니다.
          </Tip>
        </section>

        <section id="team" className="scroll-mt-16 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold border-b border-border/40 pb-3 mb-5">
            <span className="text-primary font-black mr-2">2</span>팀 만들기 · 팀원 초대
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
            팀을 만든 사람은 자동으로 그 팀의 <strong className="text-foreground">회장</strong>이 됩니다. 단톡방으로 팀원에게 링크를 던지기만 하면, 받은 사람은 카카오 로그인 한 번에 우리 팀에 들어와요.
          </p>

          <h3 className="text-base font-semibold mb-3 mt-6">
            회장: 새 팀 만들기 <Badge variant="president" />
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            가입 직후 화면에서 <strong className="text-foreground">[새 팀 만들기]</strong> 카드를 누르거나, 햄버거 메뉴(좌측 상단 ☰) → <strong className="text-foreground">팀 만들기</strong> 화면에서 새 팀을 만들 수 있어요.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground leading-relaxed pl-1">
            <li><strong className="text-foreground">팀명</strong> — 단톡방에서 부르는 이름 그대로 쓰는 게 팀원들이 알아보기 좋아요 (예: FCMZ, FK Rebirth).</li>
            <li><strong className="text-foreground">스포츠 유형</strong> — <strong className="text-foreground">축구</strong>(11명) 또는 <strong className="text-foreground">풋살</strong>(보통 5~8명) 중 우리 팀이 평소에 뛰는 종목 선택. 종목에 따라 포메이션·역할 가이드가 달라지니 정확히 골라주세요.</li>
            <li><strong className="text-foreground">[팀 만들고 시작하기]</strong> 버튼을 누르면 팀이 만들어지고, 본인은 자동으로 그 팀의 <strong className="text-foreground">회장</strong>이 됩니다.</li>
          </ol>

          <h3 className="text-base font-semibold mb-3 mt-6">회장·운영진: 팀원 초대하기</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            팀을 만들면 <strong className="text-foreground">햄버거 메뉴(좌측 상단 ☰) 아래쪽 &apos;초대 코드&apos; 영역</strong>에서 <strong className="text-foreground">[초대 링크 복사]</strong>로 팀원을 초대할 수 있어요. 경기를 한 번 등록하면 대시보드에도 <strong className="text-foreground">[팀원을 초대해 보세요]</strong> 카드가 뜨고, <strong className="text-foreground">[카카오 공유]</strong> 버튼으로 단톡방에 바로 던질 수 있습니다.
          </p>

          <div className="rounded-xl border border-border/60 bg-[hsl(var(--secondary)_/_0.2)] p-5 my-4">
            <p className="text-sm font-semibold text-foreground mb-2">단톡방에 던질 안내 예시 (자동으로 채워져요)</p>
            <div className="rounded-lg bg-[hsl(var(--background)_/_0.6)] border border-border/40 px-4 py-3 text-sm text-muted-foreground leading-relaxed select-all">
              우리 팀 참석투표·회비관리 앱이에요!<br />
              아래 링크 누르고 카카오 로그인하면 바로 가입돼요<br /><br />
              https://www.pitch-master.app/team?code=<strong className="text-foreground">[초대코드]</strong><br /><br />
              ※ 초대 코드는 햄버거 메뉴(☰) 아래쪽 &apos;초대 코드&apos; 영역에서 확인할 수 있어요
            </div>
          </div>

          <h3 className="text-base font-semibold mb-3 mt-6">팀원: 초대 링크로 가입</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            회장·총무가 단톡방에 던진 링크를 누르면, 카카오 로그인 → 이름·포지션 입력 한 번에 그 팀으로 자동 합류됩니다. 따로 신청·승인 절차 없이 바로 끝나요.
          </p>

          <div className="mt-4 space-y-2">
            <details className="rounded-xl border border-border/60 overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground cursor-pointer bg-[hsl(var(--secondary)_/_0.2)] hover:bg-[hsl(var(--secondary)_/_0.4)] transition-colors list-none">
                초대 링크를 못 받았어요. 팀 이름으로 찾을 수 있나요?
                <span className="text-muted-foreground text-base">+</span>
              </summary>
              <div className="px-4 py-4 text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-[hsl(var(--background)_/_0.4)]">
                가입 후 <strong className="text-foreground">[팀 검색해서 신청]</strong>을 누르고 팀 이름을 검색 → <strong className="text-foreground">[가입 신청]</strong> 버튼을 누르면 회장·운영진에게 신청이 가요. 승인되면 자동으로 합류됩니다.<br /><br />
                ※ 단, 회장이 설정 → 팀 설정에서 <strong className="text-foreground">[팀 검색 허용]</strong>을 켜놨을 때만 검색에 떠요.
              </div>
            </details>
            <details className="rounded-xl border border-border/60 overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground cursor-pointer bg-[hsl(var(--secondary)_/_0.2)] hover:bg-[hsl(var(--secondary)_/_0.4)] transition-colors list-none">
                한 사람이 여러 팀에 들어가도 되나요?
                <span className="text-muted-foreground text-base">+</span>
              </summary>
              <div className="px-4 py-4 text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-[hsl(var(--background)_/_0.4)]">
                됩니다. 같은 카카오 계정으로 여러 팀에 가입하거나 새 팀을 만들 수 있고, 햄버거 메뉴 위쪽의 <strong className="text-foreground">팀 전환 버튼</strong>으로 팀을 오갈 수 있어요. 평일 풋살팀 + 주말 축구팀 따로 운영하는 분들이 자주 쓰는 방식입니다.
              </div>
            </details>
          </div>
        </section>

        {/* ══════════════ 경기 운영 ══════════════ */}
        <SectionDivider label="경기 운영" />

        <section id="match-flow" className="scroll-mt-16 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold border-b border-border/40 pb-3 mb-5">
            <span className="text-primary font-black mr-2">3</span>경기 운영 흐름
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
            한 경기는 보통 이 순서로 굴러갑니다 — 회장·운영진이 1·5번을, 회원은 2·4번을 주로 합니다.
          </p>

          <StepFlow steps={["일정 등록", "투표", "전술 편성", "출석", "기록", "공유"]} />

          <h3 className="text-base font-semibold mb-3 mt-6">
            1. 경기 등록 <Badge variant="staff" />
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            하단 탭바의 <strong className="text-foreground">[일정]</strong> 메뉴 → 우측 상단 <strong className="text-foreground">[+ 일정 등록]</strong> 버튼을 누르면 경기 등록 폼이 떠요.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li><strong className="text-foreground">날짜·시간</strong> — 경기 날짜와 시작·종료 시간.</li>
            <li><strong className="text-foreground">장소</strong> — 구장 이름. 팀원들이 위치 찾기 쉽게 구체적으로 적어주세요. 입력한 장소는 경기 정보 화면에서 <strong className="text-foreground">네이버·카카오 지도 길찾기</strong> 링크로 바로 연결됩니다.</li>
            <li><strong className="text-foreground">상대팀</strong> — 자체전이면 <strong className="text-foreground">경기 종류를 [자체]</strong>로 고르고 상대팀 칸은 비워둡니다.</li>
            <li><strong className="text-foreground">경기 종류</strong> — 정규 / 자체 / 이벤트(MT·회식) 중 선택.</li>
            <li><strong className="text-foreground">투표 마감</strong> — 기본값은 경기 전날 저녁 5시.</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            <strong className="text-foreground">[등록하기]</strong> 버튼을 누르면 팀원 모두에게 <strong className="text-foreground">푸시 알림</strong>이 가고, 단톡방에 던질 수 있는 투표 링크도 같이 만들어집니다.
          </p>
          <Tip>
            <strong className="text-foreground">&quot;이벤트(팀 일정)&quot;</strong>가 따로 있는 이유 — 풋살·축구 경기는 아니지만 회식·워크샵·시즌 회의처럼 &quot;올 사람 미리 알고 싶은 일정&quot;도 똑같이 투표받고 출석 체크할 수 있어요. 정규 경기 통계엔 안 들어가게 자동으로 분리됩니다. (등록 폼에선 &quot;이벤트&quot;, 목록·상세 화면에선 &quot;팀 일정&quot;으로 보여요.)
          </Tip>

          <h3 className="text-base font-semibold mb-3 mt-6">
            2. 경기 수정 · 삭제 <Badge variant="staff" />
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            경기 상세 화면 → <strong className="text-foreground">[정보] 탭</strong> → 우측 상단의 연필 아이콘을 누르면 수정 폼이 떠요.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>날짜·시간·장소·상대팀·투표 마감일을 다시 고칠 수 있습니다.</li>
            <li>아래쪽의 <strong className="text-foreground">[경기 삭제]</strong> 버튼은 그 경기에 달린 모든 기록이 같이 사라지고 <strong className="text-foreground">되돌릴 수 없어요</strong>.</li>
            <li><strong className="text-foreground">[전적 반영 토글]</strong> — 켜면 이 경기 결과가 시즌 통계에 들어가고, 끄면 통계에서 빠져요.</li>
          </ul>
          <Tip>
            <strong className="text-foreground">경기는 저절로 끝나요 — &apos;경기 종료&apos; 버튼이 따로 없습니다.</strong> 경기 종료 시각이 지나면(종료 시각을 안 넣었으면 경기 날짜가 지나 자정이 넘으면) 몇 분 안에 자동으로 <strong className="text-foreground">&apos;끝남&apos;</strong> 상태로 바뀝니다. 끝나는 순간 MVP 투표·경기 후기·결과 알림이 줄줄이 이어지고요 — 어떤 것들이 자동으로 도는지는 <a href="#auto-ops" className="text-primary hover:underline">12번 &lsquo;자동 운영&rsquo;</a>에 정리해뒀어요.
          </Tip>

          <h3 className="text-base font-semibold mb-3 mt-6">3. 누가 뭘 할 수 있는지 — 권한 체계</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            역할은 <strong className="text-foreground">회장 → 운영진 → 회원</strong> 3단계로 나뉩니다.
          </p>
          <div className="rounded-xl border border-border/60 overflow-hidden my-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-[hsl(var(--secondary)_/_0.2)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">역할</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">할 수 있는 것</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <tr>
                  <td className="px-4 py-3 align-top"><Badge variant="president" /></td>
                  <td className="px-4 py-3 text-muted-foreground leading-relaxed">다 할 수 있어요. 팀 삭제·회원 역할 변경·시즌 만들기·종료까지. <strong className="text-foreground">한 팀에 한 명만</strong> 가능.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 align-top"><Badge variant="staff" /></td>
                  <td className="px-4 py-3 text-muted-foreground leading-relaxed">경기 등록·수정, 회비 등록·면제, 회원 강퇴, 가입 신청 승인 — 회장이 평소 하던 운영 업무 거의 다. <strong className="text-foreground">여러 명</strong> 둘 수 있어요.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 align-top"><Badge variant="member" /></td>
                  <td className="px-4 py-3 text-muted-foreground leading-relaxed">참석 투표·기록 조회·게시판·본인 프로필 수정. 가장 흔한 역할.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Tip>
            회장 자리는 다른 사람에게 <strong className="text-foreground">이임</strong>(권한 넘기기)할 수 있고, 이임하면 본인은 자동으로 운영진으로 내려갑니다 — 한 팀에 회장 0명이 되지 않도록 막혀 있어요.
          </Tip>
        </section>

        <section id="vote" className="scroll-mt-16 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold border-b border-border/40 pb-3 mb-5">
            <span className="text-primary font-black mr-2">4</span>참석 투표
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
            매주 &quot;이번 주 누가 와요?&quot; 물어볼 필요 없이, 자동 집계됩니다.
          </p>

          <StepFlow steps={["경기 등록", "자동 알림", "참석/불참/미정", "실시간 집계"]} />

          <h3 className="text-base font-semibold mb-3 mt-6">회원: 투표하는 법</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            경기가 등록되면 폰에 <strong className="text-foreground">푸시 알림</strong>이 뜨거나, 단톡방에 <strong className="text-foreground">카카오톡 공유 링크</strong>가 올라와요.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>푸시 알림 또는 단톡방 공유 링크를 누르면 경기 상세 화면으로 들어가요.</li>
            <li>위쪽 탭 중 <strong className="text-foreground">[투표]</strong> 탭을 누릅니다.</li>
            <li><strong className="text-foreground">[참석] / [미정] / [불참]</strong> 셋 중 하나를 누르면 그 자리에서 저장됩니다. 마음이 바뀌면 마감 전까지 다시 누르면 돼요.</li>
          </ol>
          <Tip>
            경기 목록 화면에서 카드 하단에 있는 <strong className="text-foreground">[참석] [미정] [불참]</strong> 버튼으로도 바로 투표할 수 있어요. 상세 화면 들어갈 필요 없이 한 번에 끝납니다.
          </Tip>

          <h3 className="text-base font-semibold mb-3 mt-6">
            운영진이 추가로 쓸 수 있는 기능 <Badge variant="staff" />
          </h3>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li><strong className="text-foreground">대리 투표</strong> — 단톡방에서만 &quot;나 갈게&quot; 답한 회원 대신 운영진이 눌러줄 수 있어요.</li>
            <li><strong className="text-foreground">미투표자 확인</strong> — 투표 안 한 회원이 누구인지 한눈에 보여요.</li>
            <li><strong className="text-foreground">투표 마감 시간 설정</strong> — 마감 하루 전에 안 한 사람한테 자동으로 리마인더 알림이 가요.</li>
            <li><strong className="text-foreground">카카오톡 링크 공유</strong> — 투표 링크를 단톡방에 바로 던질 수 있는 버튼.</li>
          </ul>
        </section>

        <section id="attendance" className="scroll-mt-16 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold border-b border-border/40 pb-3 mb-5">
            <span className="text-primary font-black mr-2">5</span>출석 체크{" "}
            <Badge variant="staff" />
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
            참석 투표는 &quot;올 예정&quot;이고, 출석 체크는 &quot;실제로 왔는지&quot; 기록입니다. 경기 끝나고 5분만 투자하면 끝나요. 출석 기록은 회비 벌금 자동 계산과 시즌 출석률 통계에 그대로 쓰입니다.
          </p>

          <StepFlow steps={["경기 등록", "참석 투표", "출석 체크", "벌금 자동 부과"]} />

          <h3 className="text-base font-semibold mb-3 mt-6">출석 체크하는 법</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>경기 상세 화면 → 위쪽 탭 중 <strong className="text-foreground">[출석] 탭</strong>으로 이동.</li>
            <li>참석 투표를 한 회원 목록이 자동으로 표시됩니다.</li>
            <li>회원별로 <strong className="text-foreground">[참석] / [지각] / [불참]</strong> 버튼 중 하나를 눌러주세요.</li>
            <li>거의 다 왔으면 위쪽의 <strong className="text-foreground">[전원 참석 처리]</strong> 버튼으로 한 번에 처리하고, 안 온 회원만 따로 [불참]으로 바꾸는 게 빠릅니다.</li>
          </ol>
          <Tip>
            팀 설정 → 회비 메뉴에서 <strong className="text-foreground">벌금 규칙</strong>을 등록해놨다면, 출석 체크가 끝나는 순간 그 회원의 벌금이 자동으로 회비 항목에 추가됩니다 — 따로 입력할 일이 없어요.
          </Tip>
        </section>

        <section id="lineup" className="scroll-mt-16 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold border-b border-border/40 pb-3 mb-5">
            <span className="text-primary font-black mr-2">6</span>전술 편성
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
            참석자가 정해지면 누가 어디에 설지 정해야겠죠. 한 명씩 손으로 끌어 배치할 수도 있고, 자동으로 채워주는 기능도 있고, AI가 우리 팀 데이터까지 보고 쿼터마다 다른 포메이션까지 짜주는 풀 플랜도 있어요.
          </p>

          <h3 className="text-base font-semibold mb-3 mt-6">편성 방식 두 가지</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground leading-relaxed pl-1">
            <li><strong className="text-foreground">규칙 기반 자동 편성</strong> — 우리 팀 기본 포메이션 위에 회원의 감독지정 포지션·선호 포지션을 우선해서 즉시 배치. 무료·즉시.</li>
            <li><strong className="text-foreground">AI 풀 플랜</strong> — 우리 팀이 승률 높은 포메이션, 참석자 실력, 상대팀 과거 이력까지 종합해서 <strong className="text-foreground">쿼터마다 다른 포메이션</strong>까지 설계해줍니다. 자세한 한도는 <a href="#ai" className="text-primary hover:underline">AI 섹션</a> 참고.</li>
          </ol>

          <h3 className="text-base font-semibold mb-3 mt-6">편성 흐름</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>경기 상세 → 위쪽 탭 중 <strong className="text-foreground">[전술] 탭</strong>으로 이동.</li>
            <li><strong className="text-foreground">[자동 편성]</strong> 또는 <strong className="text-foreground">[AI 풀 플랜]</strong> 버튼 중 하나를 누르면 1쿼터부터 자동으로 채워집니다.</li>
            <li>쿼터별 탭을 눌러가며 각 쿼터의 배치를 확인하세요.</li>
            <li>마음에 안 드는 자리가 있으면 선수 점을 <strong className="text-foreground">드래그해서 다른 자리로</strong> 옮기면 됩니다.</li>
            <li>다 됐으면 우측 상단 공유 아이콘 → 전술판을 <strong className="text-foreground">이미지로 저장</strong>하거나 <strong className="text-foreground">카카오톡으로 공유</strong>할 수 있어요.</li>
          </ol>

          <h3 className="text-base font-semibold mb-3 mt-6">쿼터 분배 원칙</h3>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li><strong className="text-foreground">감독지정 포지션 우선</strong> — 회장·운영진이 &quot;이 사람은 항상 RCB&quot;로 정해놓은 자리에 먼저 채워요.</li>
            <li>감독지정이 없으면 회원이 본인 프로필에 적은 <strong className="text-foreground">선호 포지션</strong>을 살펴봅니다.</li>
            <li>모든 참석자가 <strong className="text-foreground">비슷한 쿼터 수</strong>를 뛰도록 공정 분배해요.</li>
            <li><strong className="text-foreground">GK</strong>는 1명이면 풀 출전, 여럿이면 쿼터별로 로테이션.</li>
            <li><strong className="text-foreground">용병</strong>은 정규 슬롯이 다 채워진 뒤 자동으로 빈 자리에 들어갑니다.</li>
          </ul>
          <Tip><strong className="text-foreground">풋살 키퍼·교대 순번</strong> — 풋살 전술 탭에는 <strong className="text-foreground">[키퍼·교대 순번]</strong> 카드가 있어요. 고정 키퍼가 없을 때 <strong className="text-foreground">[번호 뽑기]</strong>를 누르면 쿼터마다 누가 골문을 볼지·누가 쉴지 번호로 공정하게 정해줍니다(선호 포지션이 GK인 사람이 한 명이면 자동으로 고정 키퍼로 인식).</Tip>

          <h3 className="text-base font-semibold mb-3 mt-6">주심·부심·촬영 자리도 같이 정해요</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            경기 운영 인력을 같은 화면에서 같이 배치할 수 있어요.
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground pl-1">
            <li><strong className="text-foreground">주심 1명</strong> — 하늘색 점</li>
            <li><strong className="text-foreground">부심 2명</strong> — 초록색 점</li>
            <li><strong className="text-foreground">촬영 1명</strong> — 보라색 점</li>
          </ul>

          <h3 className="text-base font-semibold mb-3 mt-6">역할 가이드 — &quot;내 자리에서 뭘 해야 되지?&quot; 자동 정리</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            편성이 끝나면 전술판 아래쪽에 <strong className="text-foreground">&quot;내 역할 가이드&quot;</strong> 카드가 자동으로 떠요.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>쿼터별로 <strong className="text-foreground">본인 자리의 핵심 역할·주의점·연계 플레이</strong>가 정리됩니다.</li>
            <li>같은 포메이션·같은 자리면 떨어진 쿼터도 한 카드로 묶어요 (예: &quot;2·4쿼터 RCB&quot;).</li>
            <li>쿼터마다 포메이션이 바뀌면 카드가 따로 분리됩니다.</li>
            <li>회장·운영진은 <strong className="text-foreground">드롭다운</strong>으로 다른 회원 시점도 확인할 수 있어요 (용병 제외).</li>
          </ul>
          <Tip>역할 가이드 지원 범위: <strong className="text-foreground">축구 11인제 10개 포메이션 + 풋살 5·6인제</strong>. 그 외 변형 인원수는 아직 가이드가 안 나옵니다.</Tip>
          <Tip>전술판은 <strong className="text-foreground">PC 브라우저</strong>에서도 똑같이 동작합니다. 경기 전날 밤엔 큰 화면으로 차분히 짜고, 경기장 가서는 폰으로 즉석 수정하는 운영진이 많아요.</Tip>
        </section>

        {/* ══════════════ 전술 영상 ══════════════ */}
        <SectionDivider label="전술 영상 — 메인 기능" />

        <section id="tactics-video" className="scroll-mt-16 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold border-b border-border/40 pb-3 mb-5">
            <span className="text-primary font-black mr-2">7</span>전술 영상 — 우리 팀만의 빌드업·수비 영상{" "}
            <Badge variant="staff" />
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
            전술판이 <strong className="text-foreground">한 장짜리 정지 화면</strong>이라면, 전술 영상은 그 위에서 <strong className="text-foreground">선수들이 어떻게 움직이는지</strong>까지 보여주는 동영상이에요. 회장·운영진이 직접 선수 점을 끌어 빌드업·수비 흐름을 만들면, 회원들은 경기 전에 그 영상을 보며 우리 팀 움직임을 익힐 수 있습니다.
          </p>

          <div className="rounded-xl border border-border/60 bg-[hsl(var(--secondary)_/_0.2)] p-5 my-4">
            <p className="text-sm font-semibold text-foreground mb-2">왜 영상까지 만들어야 하나요</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              조기축구·풋살에서 가장 어려운 부분이 <strong className="text-foreground">&quot;공이 좌측으로 갈 때 반대편 선수는 어디로 가야 하나?&quot;</strong> 같은 여러 명이 동시에 움직이는 흐름이에요. 전술판은 한 시점만 보여주니까 이걸 다 못 표현합니다. 시퀀스로 보면 회원이 한 번만 보고 움직임을 이해할 수 있어요.
            </p>
          </div>

          <h3 className="text-base font-semibold mb-3 mt-6">
            만드는 동선 <Badge variant="staff" />
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>햄버거 메뉴(좌측 상단 ☰) → <strong className="text-foreground">설정</strong> 메뉴 → <strong className="text-foreground">[팀 설정]</strong> 탭으로 이동.</li>
            <li>화면 위쪽의 <strong className="text-foreground">&quot;감독의 전술노트 — 공격·수비 영상 만들기&quot;</strong> 카드를 누르면 영상 목록 화면으로 들어갑니다.</li>
            <li>포메이션을 고르고(축구 11인제 10종 + 풋살 5~8인제 전부 지원) <strong className="text-foreground">[새 영상 만들기]</strong> 버튼을 누르면 편집기로 이동해요.</li>
            <li>편집기에서 <strong className="text-foreground">선수 점·공을 직접 끌어</strong> 위치를 정하고 <strong className="text-foreground">[저장]</strong>하면 끝.</li>
          </ol>

          <h3 className="text-base font-semibold mb-3 mt-6">편집기 사용법 — 영상이 만들어지는 원리부터</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            <strong className="text-foreground">&quot;영상&quot;이라고 부르지만 실제로는 여러 컷을 이어 붙인 슬라이드쇼</strong>예요. 한 컷마다 선수 위치를 그려놓으면, 컷이 바뀔 때마다 그 위치 사이를 부드럽게 보간해서 움직이는 영상처럼 재생됩니다.
          </p>

          <h4 className="text-sm font-semibold text-foreground mt-5 mb-2">① 모드 토글 (공격 시 ↔ 수비 시)</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            화면 맨 위에서 <strong className="text-foreground">[공격 시]</strong> / <strong className="text-foreground">[수비 시]</strong>를 눌러 모드를 바꿉니다. 두 모드는 따로 저장되니까 공격 흐름을 만들었으면 수비 흐름도 따로 그려주세요.
          </p>

          <h4 className="text-sm font-semibold text-foreground mt-5 mb-2">② 장면 (큰 분류)</h4>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            한 모드 안에서도 상황이 여러 가지죠. 예를 들어 공격 모드에는:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground pl-1">
            <li><strong className="text-foreground">기본 진형</strong> — 공이 아직 안 움직이는 시작 모양</li>
            <li><strong className="text-foreground">좌측 빌드업 시</strong> — 골키퍼가 공 잡고 왼쪽으로 풀어나가는 흐름</li>
            <li><strong className="text-foreground">우측 빌드업 시</strong> — 오른쪽으로 풀어나가는 흐름</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            이렇게 같은 모드 안에서도 흐름이 다른 것들을 <strong className="text-foreground">&quot;장면&quot;</strong>으로 분리합니다. <strong className="text-foreground">[장면 추가]</strong> 버튼으로 새 장면을 만들 수 있어요.
          </p>

          <h4 className="text-sm font-semibold text-foreground mt-5 mb-2">③ 컷 (장면 안의 시간 흐름)</h4>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            <strong className="text-foreground">한 장면 안에 컷을 여러 개 만들어야 영상이 됩니다.</strong> 컷 1개만 있으면 정지 화면이고, 컷 7개를 만들면 7장이 차례대로 재생되며 움직임이 보여요. 예를 들어 &quot;좌측 빌드업 시&quot; 장면을 7컷으로 짜면:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground pl-1">
            <li>1컷 — GK가 공을 잡고 시작 자세</li>
            <li>2컷 — GK가 좌측 센터백에게 짧게 패스</li>
            <li>3컷 — 좌측 센터백 → 좌측 미드, 풀백 전진 시작</li>
            <li>4컷 — 미드 → 좌측 풀백, 풀백 본격 오버랩</li>
            <li>7컷 — 크로스 → 스트라이커 마무리</li>
          </ol>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            각 컷마다 <strong className="text-foreground">선수 점</strong>을 끌어 다음 위치로 옮기고, <strong className="text-foreground">컷 설명</strong>(예: &quot;GK → 좌측 센터백 짧은 패스&quot;)을 적어두면 자막처럼 같이 표시돼요. 한 장면당 <strong className="text-foreground">5~8컷</strong> 정도가 보기 좋습니다.
          </p>

          <h4 className="text-sm font-semibold text-foreground mt-5 mb-2">④ 미리보기 — 만드는 중에 자주 눌러주세요</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            위쪽의 <strong className="text-foreground">[미리보기]</strong> 버튼을 누르면 지금 편집 중인 장면이 처음 컷부터 마지막 컷까지 자동으로 재생됩니다. <strong className="text-foreground">한 컷 만들 때마다, 또는 두세 컷마다 한 번씩 눌러서 흐름이 자연스러운지 확인하세요.</strong>
          </p>

          <h4 className="text-sm font-semibold text-foreground mt-5 mb-2">⑤ 공 표시 토글</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            각 컷 위쪽에 <strong className="text-foreground">[공 표시]</strong> 토글이 있어요. <strong className="text-foreground">&quot;기본 진형&quot;</strong>처럼 공이 움직이기 전 정지 형태에서는 OFF로 끄면 공 없이 선수 위치만 보여줍니다.
          </p>

          <h4 className="text-sm font-semibold text-foreground mt-5 mb-2">⑥ 화살표 — 이동·패스·압박 그리기</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            컷 위쪽의 <strong className="text-foreground">[✏️ 화살표 그리기]</strong>를 켜고 피치를 드래그하면 화살표를 그릴 수 있어요. <strong className="text-foreground">이동</strong>(노란 실선)·<strong className="text-foreground">패스</strong>(청록 점선)·<strong className="text-foreground">압박</strong>(빨강) 세 종류를 골라 뛰는 길·패스 방향·압박 위치를 그려두면, 선수 점만으로는 안 보이던 <strong className="text-foreground">움직임 의도</strong>가 한눈에 들어옵니다. 화살표는 <strong className="text-foreground">컷마다 따로</strong> 저장되고, <strong className="text-foreground">[실행취소]</strong>·<strong className="text-foreground">[지우기]</strong>로 정리할 수 있어요. 다 그렸으면 <strong className="text-foreground">[✓ 그리기 끝]</strong>을 눌러 선수 드래그로 돌아갑니다.
          </p>

          <h4 className="text-sm font-semibold text-foreground mt-5 mb-2">⑦ 저장 — 자주 누르세요</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            편집기 위쪽의 <strong className="text-foreground">[저장]</strong> 버튼을 누를 때마다 그 시점까지의 작업이 보관됩니다. <strong className="text-foreground">장면 하나 끝낼 때마다 한 번씩 저장하는 습관</strong>을 들이면 안전해요.
          </p>

          <h3 className="text-base font-semibold mb-3 mt-6">대표 영상으로 지정 — 회원에게 보여주는 단계</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            영상을 다 만들었어도 그냥 두면 편집기 안에만 있어요. 회원들이 경기 화면에서 볼 수 있게 하려면 <strong className="text-foreground">&quot;대표 영상&quot;</strong>으로 지정해야 합니다.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>편집기 위쪽의 <strong className="text-foreground">[우리 팀 대표로 설정]</strong> 토글을 켜면 끝.</li>
            <li>그 포메이션으로 짠 경기에서, 회원이 역할 가이드 카드를 펼치면 <strong className="text-foreground">&quot;팀 움직임 보기&quot;</strong> 토글이 나오고, 누르면 우리 팀 영상이 재생돼요.</li>
            <li>한 포메이션에 여러 버전을 만들어두고 대표만 바꿔가며 운영해도 됩니다.</li>
            <li>대표 영상이 지정 안 돼 있으면 PitchMaster가 기본 제공하는 <strong className="text-foreground">표준 영상</strong>이 대신 노출됩니다.</li>
          </ul>

          <h3 className="text-base font-semibold mb-3 mt-6">복제 — 다른 포메이션으로 시작점 활용</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            4-2-3-1 영상을 잘 만들어놨는데 4-3-3로 뛸 일이 생기면, <strong className="text-foreground">복제 기능</strong>으로 복사해서 거기부터 손볼 수 있어요. ※ 풋살은 풋살끼리, 축구는 축구끼리만 복제됩니다.
          </p>

          <h3 className="text-base font-semibold mb-3 mt-6">표준 영상 (기본 제공)</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            대표 영상을 안 만들었거나 만들기 전이라도, PitchMaster가 미리 만들어둔 <strong className="text-foreground">표준 영상</strong>이 자동으로 노출돼요.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li><strong className="text-foreground">축구 4-2-3-1</strong> — 전체 흐름 완성본. 공격 7컷 + 수비 5장면.</li>
            <li><strong className="text-foreground">그 외 축구 포메이션</strong>(4-3-3·4-4-2 등 9종) — 기본 베이스만.</li>
            <li><strong className="text-foreground">풋살 전체</strong>(5~8인제) — 기본 베이스.</li>
          </ul>

          <div className="mt-4 space-y-2">
            <details className="rounded-xl border border-border/60 overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground cursor-pointer bg-[hsl(var(--secondary)_/_0.2)] hover:bg-[hsl(var(--secondary)_/_0.4)] transition-colors list-none">
                경기 역할 가이드와 어떻게 연결되나요?
                <span className="text-muted-foreground text-base">+</span>
              </summary>
              <div className="px-4 py-4 text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-[hsl(var(--background)_/_0.4)]">
                경기 상세 → <strong className="text-foreground">[전술] 탭</strong> → 화면 아래쪽의 역할 가이드 카드를 펼치면, 그 포메이션의 영상이 들어 있는 <strong className="text-foreground">&quot;팀 움직임 보기&quot;</strong> 토글이 자동으로 나와요. 누르면 영상이 재생되고, 본인 자리는 코랄색(분홍-주황 톤)으로 강조됩니다.
              </div>
            </details>
            <details className="rounded-xl border border-border/60 overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground cursor-pointer bg-[hsl(var(--secondary)_/_0.2)] hover:bg-[hsl(var(--secondary)_/_0.4)] transition-colors list-none">
                회원도 영상을 만들 수 있나요?
                <span className="text-muted-foreground text-base">+</span>
              </summary>
              <div className="px-4 py-4 text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-[hsl(var(--background)_/_0.4)]">
                만드는 건 <strong className="text-foreground">회장·운영진만</strong>입니다. 회원은 경기 역할 가이드에서 만들어진 영상을 <strong className="text-foreground">볼 수만</strong> 있어요. 전술 의사결정 권한을 운영진에 모아둔 설계입니다.
              </div>
            </details>
          </div>
        </section>

        {/* ══════════════ 경기 기록 ══════════════ */}
        <SectionDivider label="경기 기록 · 통계" />

        <section id="record" className="scroll-mt-16 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold border-b border-border/40 pb-3 mb-5">
            <span className="text-primary font-black mr-2">8</span>경기 기록 · 통계
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
            경기 중·후에 골·어시스트·MVP를 그 자리에서 기록하면, 시즌 통계가 자동으로 쌓입니다.
          </p>

          <h3 className="text-base font-semibold mb-3 mt-6">골·어시스트 기록</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>골이 들어갔으면 <strong className="text-foreground">[+ 득점]</strong> 버튼 한 번 누르세요. 득점자·쿼터·어시스트는 일단 비워둬도 등록됩니다.</li>
            <li>상대팀이 골 넣으면 <strong className="text-foreground">[+ 실점]</strong> 버튼.</li>
            <li>등록한 골 카드를 누르면 디테일 수정 폼:
              <ul className="list-disc list-inside mt-1.5 ml-4 space-y-1">
                <li><strong className="text-foreground">득점자·어시스트</strong> — 회원 목록에서 선택.</li>
                <li><strong className="text-foreground">쿼터</strong> — 1쿼터~4쿼터 또는 &quot;모름&quot;.</li>
                <li><strong className="text-foreground">골 유형</strong> — 일반·PK·FK·헤딩·자책골.</li>
              </ul>
            </li>
          </ol>
          <Tip>기본은 <strong className="text-foreground">모든 회원이 기록 가능</strong>이에요. 설정 → 팀 설정에서 <strong className="text-foreground">[경기 기록은 운영진만]</strong> 토글을 켜면 막을 수 있어요.</Tip>

          <h3 className="text-base font-semibold mb-3 mt-6">MVP 투표</h3>
          <div className="rounded-xl border border-border/60 bg-[hsl(var(--secondary)_/_0.2)] p-5 my-4">
            <p className="text-sm font-semibold text-foreground mb-3">MVP가 공식으로 확정되는 두 가지 경로</p>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>① <strong className="text-foreground">운영진(회장·총무)이 지정</strong>하면 그 즉시 확정. 운영진 여러 명이 서로 다른 사람을 지정하면 <strong className="text-foreground">가장 최근에 지정한 1명</strong>이 MVP가 되고, 다시 지정하면 그 사람으로 바뀝니다.</p>
              <p>② <strong className="text-foreground">일반 회원 투표가 실제 참석자의 70% 이상</strong> 모이면 최다 득표자 자동 확정 (동점이면 공동 MVP).</p>
              <p>70%가 안 모이면 운영진이 <strong className="text-foreground">[MVP 직접 지정]</strong>으로 즉시 확정시킬 수 있어요.</p>
            </div>
          </div>
          <Tip>설정 → 팀 설정 → <strong className="text-foreground">[MVP 투표는 운영진만]</strong> 토글을 켜면 일반 회원 투표를 막을 수 있어요.</Tip>

          <h3 className="text-base font-semibold mb-3 mt-6">경기 일지 — 후기·메모·사진</h3>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li><strong className="text-foreground">자동 경기 후기</strong> — 경기 상태가 &quot;끝남&quot;으로 바뀌는 순간 한 줄짜리 후기 자동 생성.</li>
            <li><strong className="text-foreground">날씨</strong> — 맑음·흐림·비·눈·바람 중 선택.</li>
            <li><strong className="text-foreground">컨디션</strong> — 1~5단계.</li>
            <li><strong className="text-foreground">메모</strong> — 자유 입력.</li>
            <li><strong className="text-foreground">사진</strong> — 여러 장 업로드. 3장 그리드로 자동 정렬.</li>
            <li><strong className="text-foreground">공유</strong> — 경기 결과 카드를 카카오톡으로 보내거나 클립보드에 복사.</li>
          </ul>

          <h3 className="text-base font-semibold mb-3 mt-6">시즌 통계</h3>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>하단 탭바의 <strong className="text-foreground">[기록]</strong> 메뉴에서 시즌 단위 누적 통계를 볼 수 있어요.</li>
            <li>선수별 <strong className="text-foreground">레이더 차트</strong>로 강점·약점 한눈에.</li>
            <li><strong className="text-foreground">시즌 랭킹</strong> — 득점왕·어시스트왕·MVP왕·출석왕.</li>
            <li><strong className="text-foreground">종합 랭킹</strong> — 골·도움·MVP·수비·출석을 고루 반영한 <strong className="text-foreground">밸런스 점수</strong> 순위. 골·어시가 잘 기록되는 조기축구에서도 수비수·키퍼가 소외되지 않게 설계했어요. (점수 계산법은 아래 펼침 참고)</li>
            <li><strong className="text-foreground">수비 포인트</strong> — 키퍼와 수비수(센터백·풀백·윙백)를 한 랭킹으로. 무실점 쿼터당 <strong className="text-foreground">키퍼 2점·수비 1점</strong>. (전술판을 채운 경기 기준)</li>
            <li><strong className="text-foreground">CSV 내보내기</strong> — 기록 화면 위쪽의 <strong className="text-foreground">[내보내기]</strong> 버튼(운영진 전용)으로 지금 보는 시즌의 선수별 기록을 엑셀에서 열 수 있는 <strong className="text-foreground">CSV 파일</strong>로 저장할 수 있어요.</li>
          </ul>

          <div className="mt-4">
            <details className="rounded-xl border border-border/60 overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground cursor-pointer bg-[hsl(var(--secondary)_/_0.2)] hover:bg-[hsl(var(--secondary)_/_0.4)] transition-colors list-none">
                종합 랭킹 점수는 어떻게 매겨지나요? (밸런스 점수)
                <span className="text-muted-foreground text-base">+</span>
              </summary>
              <div className="px-4 py-4 text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-[hsl(var(--background)_/_0.4)]">
                <p className="mb-2.5">골·도움·MVP·수비·출석은 단위가 서로 달라요(골은 개수, 수비는 무실점 쿼터, 출석은 경기 수). 그냥 더하면 숫자가 큰 항목이 무조건 이깁니다. 그래서 각 부문에서 <strong className="text-foreground">&quot;우리 팀 1등&quot;에 얼마나 가까운지를 점수로 환산</strong>해 합쳐요.</p>
                <ul className="list-disc list-inside space-y-1.5 pl-1">
                  <li>부문마다 <strong className="text-foreground">팀 1등이면 20점, 절반이면 10점</strong> (내 기록 ÷ 팀 1등 기록 × 20).</li>
                  <li>골·도움·MVP·수비·출석 <strong className="text-foreground">5개 부문 점수를 합산</strong>한 게 종합 점수예요.</li>
                  <li>한 부문만 잘해선 최대 20점 → <strong className="text-foreground">여러 부문을 골고루 잘해야 종합 상위</strong>. 골만 넣는 공격수도, 무실점만 지키는 키퍼도 혼자 독주하지 못하고, 두루 기여한 선수가 1위에 올라요.</li>
                  <li>수비 기록이 적은 팀이라도 그 팀 안 수비 1등은 20점을 받으니, <strong className="text-foreground">수비수·키퍼가 순위에서 소외되지 않아요.</strong></li>
                  <li>공정성을 위해 <strong className="text-foreground">일정 경기 수 이상 출전한 선수</strong>만 대상입니다(소수 경기 요행 방지).</li>
                </ul>
                <p className="mt-2.5 text-xs">※ 우리 팀 안에서의 상대 순위예요. 점수는 팀원들 기록을 기준으로 하므로, 다른 팀과 직접 비교하는 용도는 아닙니다.</p>
              </div>
            </details>
          </div>

          <div className="mt-4">
            <details className="rounded-xl border border-border/60 overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground cursor-pointer bg-[hsl(var(--secondary)_/_0.2)] hover:bg-[hsl(var(--secondary)_/_0.4)] transition-colors list-none">
                자체전(우리끼리 A·B·C팀)은 어떻게 기록하나요?
                <span className="text-muted-foreground text-base">+</span>
              </summary>
              <div className="px-4 py-4 text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-[hsl(var(--background)_/_0.4)]">
                <ul className="list-disc list-inside space-y-1.5 pl-1">
                  <li>경기 등록할 때 <strong className="text-foreground">경기 종류를 [자체]</strong>로 고르면 자체전으로 등록됩니다.</li>
                  <li>인원을 <strong className="text-foreground">2팀 또는 3팀(A·B·C)</strong>으로 나눌 수 있어요. 참석자를 랜덤으로 자동 배정하거나 손으로 직접 나눕니다.</li>
                  <li>스코어보드·골 기록·전술판이 팀별로 분리되고, 개인 골·어시 기록까지 남습니다.</li>
                  <li><strong className="text-foreground">[전적 반영 토글]</strong>을 끄면 시즌 통계에서 자체전이 빠집니다.</li>
                </ul>
              </div>
            </details>
          </div>
        </section>

        {/* ══════════════ 회비 ══════════════ */}
        <SectionDivider label="회비" />

        <section id="dues" className="scroll-mt-16 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold border-b border-border/40 pb-3 mb-5">
            <span className="text-primary font-black mr-2">9</span>회비 관리
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
            통장 캡쳐 한 장만 올리면 누가 얼마 냈는지 자동으로 정리되고, 미납자 알림까지 한 번에 보낼 수 있어요.
          </p>

          <StepFlow steps={["회비 규칙 설정", "통장 내역 업로드", "자동 인식·매칭", "납부 현황 확인"]} />

          <h3 className="text-base font-semibold mb-3 mt-6">입출금 탭 — 월별 통장 내역</h3>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>한 달 단위로 입금·출금이 모두 정리됩니다. 누구나 볼 수 있어요.</li>
            <li>운영진은 <strong className="text-foreground">[수기 입력]</strong>으로 통장 외 거래를 직접 추가할 수 있어요.</li>
            <li>입금 내역에 회원 이름이 들어 있으면 자동으로 납부 기록과 연결됩니다.</li>
            <li>운영진은 <strong className="text-foreground">[내보내기]</strong> 버튼으로 지금 보는 달의 입출금 내역을 <strong className="text-foreground">CSV 파일</strong>(엑셀에서 열림)로 저장할 수 있어요.</li>
          </ul>

          <h3 className="text-base font-semibold mb-3 mt-6">
            납부현황 탭 <Badge variant="staff" />
          </h3>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>회원이 <strong className="text-foreground">&quot;미납·면제·납부 완료&quot;</strong> 세 그룹으로 나뉘어 표시.</li>
            <li><strong className="text-foreground">자동 매칭</strong> — 금액·이름이 맞으면 &quot;납부 완료&quot;로 자동 처리.</li>
            <li><strong className="text-foreground">미납 알림 일괄 전송</strong>. <strong className="text-foreground">2개월 이상 미납자는 자동으로 따로 표시.</strong></li>
          </ul>

          <h3 className="text-base font-semibold mb-3 mt-6">
            업로드 탭 <Badge variant="staff" />
          </h3>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li><strong className="text-foreground">AI OCR</strong> — 통장 캡쳐를 올리면 이름·금액·날짜·시간·메모를 자동으로 표로 만들어줍니다.</li>
            <li><strong className="text-foreground">엑셀 업로드</strong> — 카카오뱅크 거래내역 엑셀을 그대로 올려도 됩니다.</li>
            <li><strong className="text-foreground">중복 자동 제거</strong> — 이미 등록된 거래는 자동으로 빼줍니다.</li>
          </ul>
          <Tip>범용 AI 이미지 인식이라 <strong className="text-foreground">카카오뱅크·토스뱅크·국민·신한·우리·하나</strong> 등 대부분의 은행 앱 거래내역 캡쳐를 읽어요. (엑셀 업로드는 카카오뱅크 형식 기준.)</Tip>

          <h3 className="text-base font-semibold mb-3 mt-6">
            설정 탭 <Badge variant="staff" />
          </h3>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li><strong className="text-foreground">납부 기준일</strong> — 매월 며칠을 마감일로 볼지.</li>
            <li><strong className="text-foreground">회비 유형</strong> — 일반/학생/신입 등 유형별 금액.</li>
            <li><strong className="text-foreground">벌금 규칙</strong> — 지각·불참·미투표 시 자동 부과 금액.</li>
            <li><strong className="text-foreground">회원 회비 상태</strong> — 장기 면제/휴회/부상. 등록한 기간 동안 매월 자동 면제.</li>
          </ul>
          <Tip>이미 &quot;납부 완료&quot;로 처리된 달은 면제로 덮어쓰지 않아요.</Tip>

          <h3 className="text-base font-semibold mb-3 mt-6">벌금 탭</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>회비 → <strong className="text-foreground">[설정] 탭</strong> → <strong className="text-foreground">[벌금 규칙]</strong> → <strong className="text-foreground">[추가]</strong>.</li>
            <li>규칙 이름·발동 조건(지각/불참/미투표)·금액 입력 후 저장.</li>
            <li>경기가 끝나는 순간 해당 회원에게 자동 부과.</li>
            <li><strong className="text-foreground">[벌금] 탭</strong>에서 누적 벌금 확인 및 납부 처리.</li>
          </ol>
        </section>

        <section id="prepay" className="scroll-mt-16 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold border-b border-border/40 pb-3 mb-5">
            <span className="text-primary font-black mr-2">10</span>회비 선납{" "}
            <Badge variant="staff" />
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
            &quot;이번 분기 회비 한 번에 받자&quot;처럼 일정 기간 회비를 미리 받고 등록만 해두면, 그 기간 동안 매월이 자동으로 &quot;납부 완료&quot;로 처리됩니다.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            등록 동선: 회비 → <strong className="text-foreground">[설정] 탭</strong> → <strong className="text-foreground">회원 회비 상태 관리</strong> → <strong className="text-foreground">[추가]</strong> 버튼.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>선납받을 <strong className="text-foreground">회원 선택</strong>.</li>
            <li>상태를 <strong className="text-foreground">[선납]</strong>으로 선택.</li>
            <li>선납 기간 선택 — <strong className="text-foreground">3개월/6개월/12개월</strong>.</li>
            <li><strong className="text-foreground">시작 월</strong>과 받은 금액 입력.</li>
            <li><strong className="text-foreground">[등록]</strong>을 누르면 그 기간의 매월이 &quot;납부 완료&quot;로 자동 표시됩니다.</li>
          </ol>
          <Tip>PitchMaster 자체에는 결제·송금 기능이 없어요. 카톡 송금·계좌 이체로 받고 운영진이 선납 등록을 해주는 흐름입니다. 수수료가 0원이에요.</Tip>
        </section>

        <section id="monthly" className="scroll-mt-16 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold border-b border-border/40 pb-3 mb-5">
            <span className="text-primary font-black mr-2">11</span>월별 결산
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
            한 달 동안의 경기 결과·득점왕·회비 흐름이 한 카드로 정리되고, 카카오톡으로 단톡방에 한 번에 던질 수 있어요.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            하단 탭바의 <strong className="text-foreground">[회비]</strong> 메뉴 → 잔고 카드 아래쪽의 <strong className="text-foreground">[월별 결산 리포트]</strong> 버튼(운영진만 보여요).
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>그 달의 <strong className="text-foreground">경기 수·승·무·패</strong>.</li>
            <li><strong className="text-foreground">득점왕·도움왕·MVP왕</strong>이 자동으로 뽑혀요.</li>
            <li>그 달의 <strong className="text-foreground">회비 입금 합계·지출 합계</strong>와 미납 회원 목록.</li>
            <li>출석률 상위 회원.</li>
            <li><strong className="text-foreground">[카카오톡 공유]</strong> 버튼으로 단톡방에 한 번에 던질 수 있습니다.</li>
          </ul>
        </section>

        {/* ══════════════ AI 기능 ══════════════ */}
        <SectionDivider label="AI 기능" />

        <section id="ai" className="scroll-mt-16 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold border-b border-border/40 pb-3 mb-5">
            <span className="text-primary font-black mr-2">12</span>AI·자동화 기능
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
            운영진이 평소에 손으로 정리하던 일을 대신 해주는 자동화 기능 다섯 가지예요. 이 중 <strong className="text-foreground">AI 풀 플랜·AI 코치 분석·회비 OCR 세 가지가 Anthropic의 Claude 모델</strong>을 쓰고(한국 풋살·축구 동호회 데이터로 톤을 다듬었습니다), 자동 경기 후기·선수 시그니처는 팀 기록을 바탕으로 한 <strong className="text-foreground">규칙 기반 자동 생성</strong>이에요.
          </p>

          <h3 className="text-base font-semibold mb-3 mt-6">한눈에 보는 다섯 가지</h3>
          <div className="rounded-xl border border-border/60 overflow-hidden my-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-[hsl(var(--secondary)_/_0.2)]">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">기능 · 어디서</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">한도</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <tr>
                  <td className="px-3 py-3 align-top">
                    <strong className="text-foreground">AI 풀 플랜</strong>{" "}
                    <span className="text-muted-foreground text-xs">편성 + 작전 브리핑</span>
                    <br /><span className="text-muted-foreground text-xs">경기 → [전술] 탭 → [AI 풀 플랜]</span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">경기당 3회<br />팀 월 20회</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 align-top">
                    <strong className="text-foreground">AI 코치 분석</strong>{" "}
                    <span className="text-muted-foreground text-xs">편성 후 분석만</span>
                    <br /><span className="text-muted-foreground text-xs">경기 → [전술] 탭 → 자동 편성 후 [AI 코치 분석]</span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">경기당 4회<br />팀 월 30회</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 align-top">
                    <strong className="text-foreground">자동 경기 후기</strong>{" "}
                    <span className="text-muted-foreground text-xs">한 줄 요약 · 규칙 기반</span>
                    <br /><span className="text-muted-foreground text-xs">경기 → [후기] 탭 (끝나면 자동)</span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">경기당 1회<br />재생성</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 align-top">
                    <strong className="text-foreground">선수 시그니처</strong>{" "}
                    <span className="text-muted-foreground text-xs">한 줄 별명 · 규칙 기반</span>
                    <br /><span className="text-muted-foreground text-xs">회원 프로필 카드</span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">운영진이<br />재생성</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 align-top">
                    <strong className="text-foreground">회비 OCR</strong>{" "}
                    <span className="text-muted-foreground text-xs">통장 캡쳐 자동 인식</span>
                    <br /><span className="text-muted-foreground text-xs">회비 → [업로드] 탭</span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">팀 월 100회</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 className="text-sm font-semibold text-foreground mt-6 mb-2">1. AI 풀 플랜</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            우리 팀 승률 높은 포메이션, 참석자 실력, 상대팀 과거 이력까지 종합해서 <strong className="text-foreground">쿼터마다 다른 포메이션</strong>까지 설계해줍니다. 편성과 동시에 <strong className="text-foreground">감독 작전 브리핑</strong>이 같이 만들어져요.
          </p>

          <h4 className="text-sm font-semibold text-foreground mt-5 mb-2">2. AI 코치 분석</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            편성은 직접 했는데 작전 브리핑만 받고 싶을 때 따로 부르는 기능.
          </p>

          <h4 className="text-sm font-semibold text-foreground mt-5 mb-2">3. 자동 경기 후기</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            경기가 &quot;끝남&quot; 상태로 바뀌는 순간, 득점·MVP·참석 정보로 한 줄짜리 후기가 자동으로 만들어집니다. 경기 결과 카드에 같이 들어가서 카톡으로 던질 때 깔끔해요.
          </p>

          <h4 className="text-sm font-semibold text-foreground mt-5 mb-2">4. 선수 시그니처</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            회원의 시즌 누적 기록을 바탕으로 규칙 기반으로 한 줄짜리 별명을 만들어줍니다 (예: &quot;우리 팀 황소&quot;, &quot;왼발의 마술사&quot;). 그 회원의 프로필 카드에 표시돼요.
          </p>

          <h4 className="text-sm font-semibold text-foreground mt-5 mb-2">5. 회비 OCR</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            통장 캡쳐를 올리면 <strong className="text-foreground">이름·금액·날짜·시간·메모</strong>를 자동으로 표로 만들어줍니다. 카카오뱅크·토스뱅크·국민·신한·우리·하나 등 대부분의 은행 앱 거래내역 캡쳐를 인식해요.
          </p>
          <Tip>실패한 호출이나 자동 규칙으로 대신 처리된 경우는 한도에서 차감되지 않아요.</Tip>

          <h3 id="auto-ops" className="scroll-mt-16 text-base font-semibold mb-3 mt-8">
            손 안 대도 돌아가는 자동 운영
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            아래 일들은 <strong className="text-foreground">앱이 정해진 때에 알아서</strong> 처리해요. 운영진이 따로 버튼을 누를 필요가 없고, 대부분 눈에 잘 안 띄어서 &quot;이거 누가 해준 거지?&quot; 싶은 것들입니다. 이 중 알림은 <a href="#pwa" className="text-primary hover:underline">홈 화면에 추가(14번)</a>해서 푸시를 켜둔 사람에게 폰 알림으로 가고, 안 켜뒀어도 앱 안 <strong className="text-foreground">종(🔔) 아이콘</strong>에는 쌓여요.
          </p>
          <div className="rounded-xl border border-border/60 overflow-hidden my-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-[hsl(var(--secondary)_/_0.2)]">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">자동으로 되는 일</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">언제 · 누구에게</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <tr>
                  <td className="px-3 py-3 align-top"><strong className="text-foreground">경기가 &apos;끝남&apos;으로 전환</strong><br /><span className="text-muted-foreground text-xs">MVP·후기·결과 알림이 여기서 시작</span></td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">종료 시각이 지나면(시각 없으면 경기 날짜가 지나 자정이 넘으면) · 몇 분 안에</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 align-top"><strong className="text-foreground">MVP 투표 시작 알림</strong></td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">경기가 끝나는 즉시 · 그 경기 참석자에게</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 align-top"><strong className="text-foreground">경기 결과 알림</strong><br /><span className="text-muted-foreground text-xs">승·무·패 + 득점자</span></td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">경기 당일 저녁 · 팀 전체에게</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 align-top"><strong className="text-foreground">선수 카드 능력치(OVR)·등급 갱신</strong></td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">경기 기록이 쌓인 뒤 · 눈에 띄게 오른 선수에게 축하 알림</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 align-top"><strong className="text-foreground">내 역할 가이드 알림</strong></td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">투표가 마감되면 · 참석 투표한 사람에게</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 align-top"><strong className="text-foreground">투표 마감 리마인더</strong></td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">마감 전날 아침 · 아직 투표 안 한 사람에게</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 align-top"><strong className="text-foreground">미투표 벌금 자동 부과</strong></td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">투표 마감 뒤 · 미투표 벌금 규칙을 켠 팀만</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 align-top"><strong className="text-foreground">회비 미납 알림</strong></td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">매월 1일·15일 · 그 달 미납 회원에게</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 align-top"><strong className="text-foreground">회비 자동 면제 처리</strong></td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">선납·장기면제 등록 기간 내내 · 매월 &apos;납부 완료&apos;로 표시</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 align-top"><strong className="text-foreground">휴면 회원 자동 복귀</strong></td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">휴면 종료일이 지나면 · 다시 활동 회원으로</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 align-top"><strong className="text-foreground">경기일 날씨 예보</strong></td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">경기 5일 전부터 · 경기 정보 화면에 표시</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 align-top"><strong className="text-foreground">생일 축하 카드</strong></td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">생일 당일 · 대시보드 맨 위에 표시</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 align-top"><strong className="text-foreground">첫 경기·팀원 초대 안내</strong></td>
                  <td className="px-3 py-3 text-muted-foreground align-top text-xs">팀을 만든 뒤 며칠간 팀원·경기가 없으면 · 회장에게</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Tip>
            <strong className="text-foreground">&apos;미정&apos;은 투표를 안 한 것으로 봐요.</strong> 참석·불참을 정하지 않고 미정으로만 두면, 미투표 벌금 규칙을 켜둔 팀에서는 벌금 대상이 됩니다. 마감 전에 <strong className="text-foreground">참석 또는 불참</strong>으로 꼭 정해주세요.
          </Tip>
          <Tip>
            <strong className="text-foreground">계정을 탈퇴하면</strong> 14일 동안은 되돌릴 여유를 두고, 그 뒤에 회원 정보와 작성한 글·댓글 등 개인 데이터가 완전히 삭제됩니다.
          </Tip>
        </section>

        {/* ══════════════ 더보기 ══════════════ */}
        <SectionDivider label="더보기" />

        <section id="more" className="scroll-mt-16 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold border-b border-border/40 pb-3 mb-5">
            <span className="text-primary font-black mr-2">13</span>게시판 · 멤버 · 유니폼 · 알림 · 시즌
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
            경기 운영·회비 외에 평소에 자주 쓰는 보조 기능들입니다.
          </p>

          <h3 id="board" className="text-base font-semibold mb-3 mt-6">게시판 — 단톡방에 묻히지 않는 공지</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            햄버거 메뉴 → <strong className="text-foreground">[게시판 · 앨범]</strong> 메뉴.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>카테고리는 <strong className="text-foreground">일반·팀공지</strong> 2가지. 모든 글에 <strong className="text-foreground">투표(설문)</strong>를 첨부할 수 있어요.</li>
            <li><strong className="text-foreground">팀공지</strong>(운영진만 작성)는 자동으로 목록 맨 위에 고정돼요.</li>
            <li>댓글·좋아요 가능.</li>
          </ul>

          <h3 id="members" className="text-base font-semibold mb-3 mt-6">
            회원 관리 <Badge variant="president" /> <Badge variant="staff" />
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            햄버거 메뉴 → <strong className="text-foreground">[회원 관리]</strong> 메뉴.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li><strong className="text-foreground">역할 변경</strong> — 회원 ↔ 운영진 ↔ 회장 사이 권한 변경.</li>
            <li><strong className="text-foreground">등번호 지정</strong> — 한 팀에 같은 번호는 두 명 못 갖습니다.</li>
            <li><strong className="text-foreground">주장·부주장</strong> — 온필드 주장(C 뱃지)·부주장(VC 뱃지) 지정. 회원 카드·기록 화면에 자동 표시.</li>
            <li><strong className="text-foreground">사전 등록</strong> — 아직 가입 안 한 회원의 이름·연락처를 미리 등록. 본인이 직접 가입하면 자동으로 연결됩니다.</li>
            <li><strong className="text-foreground">휴면 처리</strong> — 장기간 안 나오는 회원을 &quot;휴면&quot; 상태로. 통계·회비 대상에서 자동 제외.</li>
            <li><strong className="text-foreground">강퇴</strong> — 강퇴된 회원의 과거 기록은 그대로 보관됩니다.</li>
          </ul>
          <Tip><strong className="text-foreground">회장이 0명이 되는 일은 시스템이 막아요.</strong> 회장은 <strong className="text-foreground">[회장 이임]</strong>으로 다른 회원에게 권한을 먼저 넘긴 후에만 일반 회원으로 내려갈 수 있습니다.</Tip>

          <h3 id="guests" className="text-base font-semibold mb-3 mt-6">용병 관리 — 그날만 부르는 외부 인원</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            등록 동선: 경기 상세 → <strong className="text-foreground">[전술] 탭</strong> → <strong className="text-foreground">용병</strong> 카드 → <strong className="text-foreground">[용병 등록]</strong> 버튼.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>이름·포지션·연락처·메모만 입력하면 등록 완료.</li>
            <li>등록된 용병은 그 경기의 전술판에 자동으로 들어가서 정규 회원과 똑같이 배치할 수 있어요.</li>
            <li><strong className="text-foreground">경기마다 따로 관리</strong>됩니다 — 한 경기에 등록한 용병이 다음 경기에 자동으로 또 등록되진 않아요.</li>
            <li>AI 분석은 용병에 단정적인 평가를 하지 않도록 톤이 조정돼 있습니다.</li>
          </ul>

          <h3 id="uniform" className="text-base font-semibold mb-3 mt-6">유니폼 — 우리 팀 색깔</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            햄버거 메뉴 → <strong className="text-foreground">[설정]</strong> → <strong className="text-foreground">[팀 설정]</strong> → 아래쪽 <strong className="text-foreground">[유니폼]</strong> 섹션.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li><strong className="text-foreground">홈·원정·써드</strong> 세 종류로 따로 등록할 수 있어요.</li>
            <li>메인 색상·서브 색상·패턴(<strong className="text-foreground">단색/세로 스트라이프/가로 스트라이프/대각 스트라이프</strong>) 선택.</li>
            <li>경기 상세 → [정보] 탭에서 그날 어떤 유니폼을 입을지 [홈/원정/써드] 버튼으로 골라두면 단톡방 공유 카드에도 그대로 들어갑니다.</li>
          </ul>

          <h3 id="notif" className="text-base font-semibold mb-3 mt-6">알림 설정 · 푸시가 안 올 때</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            알림을 켜고 끄는 곳: 햄버거 메뉴 → <strong className="text-foreground">[설정]</strong> → 개인 설정 안의 <strong className="text-foreground">[알림]</strong> 섹션. 화면 상단 <strong className="text-foreground">종(🔔) 아이콘</strong>을 누르면 받은 알림이 모여 있고, <strong className="text-foreground">[모두 읽음]</strong> 버튼으로 한 번에 정리할 수 있어요.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>자동으로 가는 알림: <strong className="text-foreground">경기 등록·투표 마감 리마인더·가입 승인·MVP 투표 시작 안내</strong>.</li>
            <li><strong className="text-foreground">안드로이드(갤럭시 등)는 크롬·삼성 인터넷 어느 브라우저든 알림을 허용하면 앱 없이도 푸시를 받을 수 있어요.</strong> 더 안정적으로 받고 싶다면 Google Play의 <strong className="text-foreground">&apos;피치마스터&apos;</strong> 앱을 설치해도 됩니다(선택).</li>
            <li>아이폰은 사파리에서 <strong className="text-foreground">[홈 화면에 추가]</strong>(다음 섹션)를 한 뒤, 그 아이콘으로 처음 들어갈 때 뜨는 &quot;알림을 허용할까요?&quot;를 허용해주세요.</li>
          </ul>
          <Tip>알림이 안 오면? ① <strong className="text-foreground">설정 → 알림</strong> 토글이 켜져 있는지 ② (갤럭시) <strong className="text-foreground">Play 스토어 앱으로 설치</strong>했는지 ③ (아이폰) <strong className="text-foreground">홈 화면 아이콘</strong>으로 들어왔는지 ④ 카카오톡 안 브라우저가 아닌지 확인하세요.</Tip>

          <h3 id="season" className="text-base font-semibold mb-3 mt-6">
            시즌 관리 <Badge variant="president" />
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            햄버거 메뉴 → <strong className="text-foreground">[설정]</strong> → <strong className="text-foreground">[시즌 관리]</strong> 탭.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-1">
            <li>시즌 이름과 시작일~종료일을 정해 새 시즌을 만듭니다.</li>
            <li>시즌이 다르면 통계도 자동으로 분리돼서 집계돼요. 시즌 끝날 때 시상하기 좋습니다.</li>
            <li>이전 시즌의 기록은 그대로 보관돼요.</li>
          </ul>

          <div className="mt-4">
            <details className="rounded-xl border border-border/60 overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground cursor-pointer bg-[hsl(var(--secondary)_/_0.2)] hover:bg-[hsl(var(--secondary)_/_0.4)] transition-colors list-none">
                그 외 알아두면 좋은 보조 기능
                <span className="text-muted-foreground text-base">+</span>
              </summary>
              <div className="px-4 py-4 text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-[hsl(var(--background)_/_0.4)]">
                <ul className="list-disc list-inside space-y-1.5 pl-1">
                  <li><strong className="text-foreground">회칙</strong> — 팀 규칙·운영 원칙 한 페이지로 정리.</li>
                  <li><strong className="text-foreground">경기별 댓글</strong> — &quot;늦어요&quot;, &quot;용병 한 명 가능해요?&quot; 같은 경기별 짧은 소통용.</li>
                  <li><strong className="text-foreground">투표 마감 리마인더</strong> — 마감 전날 자동으로 미투표자에게 알림.</li>
                  <li><strong className="text-foreground">경기일 날씨 예보</strong> — 경기 5일 전부터 자동으로 표시.</li>
                  <li><strong className="text-foreground">생일 축하 카드</strong> — 팀원 중 오늘 생일인 사람이 있으면 대시보드 맨 위에 자동으로 떠요.</li>
                  <li><strong className="text-foreground">라이트/다크 모드</strong> — 화면 우측 상단 토글 또는 설정에서 전환.</li>
                  <li><strong className="text-foreground">경기 결과 공유 카드</strong> — 일지 탭에서 깔끔한 이미지 카드로 단톡방·SNS 공유.</li>
                  <li><strong className="text-foreground">팀 로고 업로드</strong> — 이미지 크롭까지 안에서 처리, 등록하면 헤더·공유 카드에 자동 표시.</li>
                  <li><strong className="text-foreground">풋살 전용</strong> — 5~8인제, 풋살 포지션(피소·아라·피벗), 풋살 코트 비율 별도 지원.</li>
                </ul>
              </div>
            </details>
          </div>

          <div className="mt-6">
            <Link
              href="/login"
              className="block text-center bg-primary text-primary-foreground rounded-xl px-4 py-3 text-sm font-bold hover:bg-[hsl(var(--primary)_/_0.9)] transition-colors"
            >
              직접 체험해보기
            </Link>
          </div>
        </section>

        {/* ══════════════ 설치 ══════════════ */}
        <SectionDivider label="설치" />

        <section id="pwa" className="scroll-mt-16 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold border-b border-border/40 pb-3 mb-5">
            <span className="text-primary font-black mr-2">14</span>홈 화면에 추가하기
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
            PitchMaster는 일반 앱이 아니라 <strong className="text-foreground">웹앱(PWA)</strong>이에요. 한 번 홈 화면에 추가해두면 다음부터는 일반 앱처럼 아이콘 한 번 누르면 바로 열리고, 푸시 알림도 받을 수 있어요.
          </p>

          <details open className="rounded-xl border border-border/60 overflow-hidden mb-2">
            <summary className="flex items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground cursor-pointer bg-[hsl(var(--secondary)_/_0.2)] hover:bg-[hsl(var(--secondary)_/_0.4)] transition-colors list-none">
              아이폰 (Safari 사용)
              <span className="text-muted-foreground text-base">+</span>
            </summary>
            <div className="px-4 py-4 text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-[hsl(var(--background)_/_0.4)]">
              <ol className="list-decimal list-inside space-y-2 pl-1">
                <li>Safari 앱으로 pitch-master.app에 접속하세요. 카톡 안 브라우저나 다른 브라우저로 들어오면 안 돼요 — 꼭 Safari여야 합니다.</li>
                <li>화면 하단 가운데의 <strong className="text-foreground">공유 아이콘</strong>(위쪽 화살표가 있는 네모) 탭.</li>
                <li>아래로 스크롤해서 <strong className="text-foreground">[홈 화면에 추가]</strong>를 누릅니다.</li>
                <li>우측 상단의 <strong className="text-foreground">[추가]</strong>를 누르면 끝.</li>
              </ol>
            </div>
          </details>

          <details className="rounded-xl border border-border/60 overflow-hidden mb-2">
            <summary className="flex items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground cursor-pointer bg-[hsl(var(--secondary)_/_0.2)] hover:bg-[hsl(var(--secondary)_/_0.4)] transition-colors list-none">
              안드로이드 (갤럭시 등) — 홈 화면 추가 · 앱은 선택
              <span className="text-muted-foreground text-base">+</span>
            </summary>
            <div className="px-4 py-4 text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-[hsl(var(--background)_/_0.4)]">
              <p className="mb-2">
                안드로이드는 <strong className="text-foreground">크롬·삼성 인터넷 브라우저에서 [홈 화면에 추가]</strong>만 해도 앱처럼 쓰고 알림(푸시)도 받을 수 있어요. 더 안정적으로 받고 싶다면 <strong className="text-foreground">Google Play의 &apos;피치마스터&apos; 앱 설치</strong>를 추천합니다(선택).
              </p>
              <ol className="list-decimal list-inside space-y-2 pl-1">
                <li>Play 스토어에서 <strong className="text-foreground">&apos;피치마스터&apos;</strong> 검색 → 설치 (또는 footer의 Google Play 버튼).</li>
                <li>앱을 열고 카카오 로그인 — 웹과 같은 계정·데이터라 그대로 이어집니다.</li>
              </ol>
              <p className="mt-2 text-xs">
                브라우저로만 쓰고 싶다면, 브라우저 우측 상단 메뉴(점 세 개) → <strong className="text-foreground">[홈 화면에 추가]</strong> 후 알림을 허용하면 됩니다. (카카오톡 인앱 브라우저에서는 알림이 막혀 있으니 크롬·삼성 인터넷으로 열어주세요.)
              </p>
            </div>
          </details>

          <Tip>아이폰은 홈 화면에 추가한 아이콘으로 들어왔을 때만 <strong className="text-foreground">푸시 알림</strong>을 받을 수 있어요(일반 브라우저 탭에선 안 옴). 안드로이드는 크롬·삼성 인터넷에서 알림 허용만 하면 받을 수 있고, 더 안정적으로 원하면 Play 스토어 앱을 설치하면 됩니다.</Tip>
        </section>

        {/* ══════════════ FAQ ══════════════ */}
        <SectionDivider label="FAQ" />

        <section id="faq" className="scroll-mt-16 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold border-b border-border/40 pb-3 mb-5">
            <span className="text-primary font-black mr-2">15</span>자주 묻는 질문
          </h2>

          <div className="space-y-2">
            {[
              {
                q: "앱 설치가 꼭 필요한가요?",
                a: "아니에요. 링크만 누르면 바로 쓸 수 있어요. 다만 일반 앱처럼 쓰고 싶거나 푸시 알림을 받고 싶다면 14번 홈 화면에 추가하기를 한 번만 해두시면 그 다음부턴 아이콘으로 바로 들어가고 알림도 받을 수 있습니다.",
              },
              {
                q: "팀원도 앱을 깔아야 하나요?",
                a: "아니에요. 단톡방에 던진 초대 링크만 누르면 카카오 로그인 → 가입 완료입니다. 앱 설치를 부탁할 필요가 없어요.",
              },
              {
                q: "한 계정으로 여러 팀에 들어갈 수 있나요?",
                a: "됩니다. 같은 카카오 계정으로 여러 팀에 가입하거나 새 팀을 만들 수 있고, 햄버거 메뉴 위쪽의 팀 전환 버튼으로 팀을 오갈 수 있어요.",
              },
              {
                q: "카카오톡 안에서 링크를 열면 안 되는 게 있나요?",
                a: "네. 카카오톡 안 브라우저(인앱 브라우저)에선 푸시 알림·홈 화면에 추가가 막혀 있어요. 카카오 안에서 링크를 열었을 때 우측 상단의 ··· 메뉴 → [다른 브라우저로 열기](또는 [Safari로 열기])를 누르면 외부 브라우저로 넘어가서 모든 기능을 쓸 수 있어요.",
              },
              {
                q: "알림(푸시)이 안 와요.",
                a: "안드로이드(갤럭시 등)는 크롬·삼성 인터넷 어느 브라우저든 '홈 화면에 추가' 후 알림을 허용하면 앱 없이도 푸시를 받아요. 더 안정적으로 받고 싶으면 Google Play의 '피치마스터' 앱을 설치해도 됩니다(선택). 아이폰은 사파리에서 홈 화면에 추가한 뒤 '알림 허용'을 눌러주세요. 그래도 안 오면 ① 설정 → 알림 토글이 켜져 있는지 ② 폰 자체 알림 권한이 켜져 있는지 ③ 카카오톡 안 브라우저로 보고 있는 건 아닌지 확인하세요. 자세한 건 13번 알림 설정 섹션 참고.",
              },
              {
                q: "이전 시즌 데이터를 PitchMaster로 옮길 수 있나요?",
                a: "됩니다. 엑셀·스프레드시트로 정리된 경기 결과·회비 내역·회원 목록을 보내주시면 운영팀이 일괄 등록을 도와드려요. 아래 16번 문의 섹션의 오픈채팅방에서 편하게 말씀해주세요.",
              },
              {
                q: "회비 납부 기준일을 바꿀 수 있나요?",
                a: "됩니다. 하단 탭바 [회비] → [설정] 탭에서 납부 기준일을 바꿀 수 있어요.",
              },
              {
                q: "회비를 6개월·1년치 한 번에 받고 싶은데요?",
                a: "회비 → [설정] 탭 → 회원 회비 상태 관리 → [추가] 버튼을 누르고, 상태를 [선납]으로 바꾼 뒤 회원·기간(3·6·12개월)·시작 월을 고르면 등록 끝. 자세한 건 10번 회비 선납 섹션 참고.",
              },
              {
                q: "이미 끝난 경기의 참석자를 수정할 수 있나요?",
                a: "네. 회장·운영진은 끝난 경기에서도 [투표] 탭에서 참석자를 추가·삭제·변경할 수 있어요.",
              },
              {
                q: "회원을 장기 면제·휴회로 처리하려면?",
                a: "회비 → [설정] 탭 → 아래쪽의 [회원 회비 상태]에서 [추가] 버튼 → 면제/휴회/부상 중 골라서 시작일~종료일과 함께 등록하세요. 등록한 기간 동안은 매월 자동으로 면제 처리돼요.",
              },
              {
                q: "벌금 규칙은 어떻게 만드나요?",
                a: "회비 → [설정] 탭 → 아래쪽의 [벌금 규칙]에서 [추가] 버튼 → 규칙 이름·발동 조건(지각/불참/미투표)·금액을 입력하면 끝. 그 다음부터는 경기가 끝나는 순간 자동으로 벌금이 부과됩니다.",
              },
              {
                q: "유니폼 색깔·패턴은 어떻게 등록하나요?",
                a: "햄버거 메뉴 → [설정] → [팀 설정] 아래쪽의 [유니폼] 섹션에서 홈·원정·써드 각각의 메인 색상·서브 색상·패턴을 고르면 됩니다.",
              },
              {
                q: "MVP는 어떻게 결정되나요?",
                a: "두 가지 경로가 있어요. ① 회장·운영진 1명 이상이 투표하면 그 즉시 확정. ② 일반 회원 투표가 실제 참석자의 70% 이상이면 최다 득표자 자동 확정. 자세한 건 8번 경기 기록 섹션 참고.",
              },
              {
                q: "AI 기능 사용 한도가 있나요?",
                a: "기능별로 다릅니다. AI 풀 플랜은 경기당 3회 + 팀 월 20회, AI 코치 분석은 경기당 4회 + 팀 월 30회, 자동 경기 후기는 경기당 1회 재생성, 회비 OCR은 팀 월 100회. 실패한 호출이나 자동 규칙으로 대신 처리된 경우는 한도에서 차감되지 않아요.",
              },
              {
                q: "경기가 언제 자동으로 끝나요? '경기 종료' 버튼이 안 보여요.",
                a: "따로 누르는 버튼이 없어요. 경기 종료 시각이 지나면(등록할 때 종료 시각을 안 넣었으면 경기 날짜가 지나 자정이 넘으면) 몇 분 안에 자동으로 '끝남' 상태가 됩니다. 끝나는 순간 MVP 투표 시작·경기 후기·결과 알림이 자동으로 이어져요. 자세한 자동 동작은 12번 'AI·자동화 기능'의 자동 운영 표를 참고하세요.",
              },
              {
                q: "참석/불참 안 정하고 '미정'으로 두면 벌금이 붙나요?",
                a: "미투표 벌금 규칙을 켜둔 팀이라면 붙습니다. '미정'은 의사표시를 안 한 것으로 봐서 투표 안 한 사람과 똑같이 처리돼요. 마감 전에 참석 또는 불참으로 정해두면 벌금 대상에서 빠집니다. (미투표 벌금 규칙을 안 만든 팀은 애초에 해당 없음.)",
              },
              {
                q: "계정을 탈퇴하면 내 데이터는 어떻게 되나요?",
                a: "탈퇴 후 14일 동안은 되돌릴 수 있게 보관하고, 그 뒤에 회원 정보와 본인이 작성한 글·댓글 등 개인 데이터가 완전히 삭제됩니다.",
              },
              {
                q: "무료인가요?",
                a: "현재 모든 기능을 무료로 쓸 수 있어요. 운영 비용을 충당하기 위해 앞으로 유료 요금제가 도입될 수 있고, 변경되는 시점이 오면 사전에 충분히 안내드릴 예정입니다. 먼저 함께해주신 팀에는 별도 보호 정책이 있어요.",
              },
            ].map(({ q, a }) => (
              <details key={q} className="rounded-xl border border-border/60 overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground cursor-pointer bg-[hsl(var(--secondary)_/_0.2)] hover:bg-[hsl(var(--secondary)_/_0.4)] transition-colors list-none">
                  {q}
                  <span className="shrink-0 ml-3 text-muted-foreground text-base">+</span>
                </summary>
                <div className="px-4 py-4 text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-[hsl(var(--background)_/_0.4)]">
                  {a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ══════════════ 문의 ══════════════ */}
        <section id="contact" className="scroll-mt-16 mt-12 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold border-b border-border/40 pb-3 mb-5">
            <span className="text-primary font-black mr-2">16</span>문의 · 피드백
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-5">
            사용하다가 궁금한 점·헷갈리는 부분, 또는 &quot;이런 기능 있으면 좋겠다&quot; 하는 아이디어가 있으면 편하게 던져주세요. 작은 의견 하나가 다음 업데이트에 그대로 들어갑니다.
          </p>

          <a
            href="https://open.kakao.com/o/gbhRaXmi"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center rounded-xl px-4 py-3 text-sm font-bold mb-2 transition-colors"
            style={{ background: "#fee500", color: "#191919" }}
          >
            카카오 오픈채팅 참여하기
          </a>
          <p className="text-center text-xs text-muted-foreground mb-6">
            버그 제보·기능 제안·사용법 질문 모두 환영합니다
          </p>

          <Link
            href="/login"
            className="block text-center bg-primary text-primary-foreground rounded-xl px-4 py-3 text-sm font-bold hover:bg-[hsl(var(--primary)_/_0.9)] transition-colors"
          >
            지금 시작하기
          </Link>
        </section>

        {/* 푸터 CTA */}
        <footer className="mt-12 border-t border-border/40 pt-8">
          <div className="rounded-2xl bg-[hsl(var(--secondary)_/_0.3)] p-5">
            <p className="text-sm font-semibold text-foreground">
              조기축구·풋살 동호회 운영을 한 곳에서
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              회비 OCR · 출석 투표 · AI 자동 라인업 · 전술판 · 경기 기록 — 지금 무료로 사용해보세요.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-[hsl(var(--primary)_/_0.9)] transition-colors"
              >
                피치마스터 무료로 시작
              </Link>
              <a
                href="https://play.google.com/store/apps/details?id=app.pitchmaster"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-border/60 px-4 py-2 text-sm font-semibold text-foreground hover:bg-[hsl(var(--secondary)_/_0.4)] transition-colors"
              >
                Google Play에서 설치
              </a>
            </div>
          </div>
        </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
