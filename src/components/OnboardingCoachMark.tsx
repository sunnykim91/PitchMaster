"use client";

/**
 * OnboardingCoachMark — 첫 진입 5스텝 가이드 투어
 *
 * 모바일·태블릿(< lg) 사용자가 햄버거·탭바 메뉴 위치를 처음 한 번 안내.
 * createPortal로 body 직접 렌더, anchor 위치를 동적 측정해 spotlight + 카드 노출.
 *
 * - 1회만: localStorage["pm_coach_mark_v1"]
 * - 트리거: DashboardClient에서 mount 시 useEffect → start()
 * - 외부 재실행: window.dispatchEvent(new CustomEvent("pm:coach-mark:start"))
 *
 * PC(lg+)는 sidebar로 직관적이라 코치 마크 노출 안 함.
 */

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, X } from "lucide-react";

const STORAGE_KEY = "pm_coach_mark_v1";

interface CoachStep {
  coachId: string;
  title: string;
  description: string;
}

const STEPS: CoachStep[] = [
  {
    coachId: "hamburger",
    title: "전체 메뉴는 여기서 열려요",
    description: "회원·게시판·회칙·설정·로그아웃까지 한 곳에 모여 있어요.",
  },
  {
    coachId: "tab-matches",
    title: "경기·일정 등록",
    description: "여기서 일정을 등록하면 참석 투표가 자동으로 진행됩니다.",
  },
  {
    coachId: "tab-records",
    title: "골/어시·시즌 통계",
    description: "경기 결과·MVP·선수 카드가 모이는 곳이에요.",
  },
  {
    coachId: "tab-dues",
    title: "회비 관리",
    description: "통장 캡처 한 장만 올리면 자동으로 정리돼요.",
  },
  {
    coachId: "tab-more",
    title: "게시판·회칙·설정",
    description: "단톡방 공지를 대신할 게시판과 팀 회칙·앱 설정이 여기 있어요.",
  },
];

interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingCoachMark() {
  const [stepIdx, setStepIdx] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<AnchorRect | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 이미 본 사용자 skip + lg 이상 skip
  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 1024) return; // lg+ 는 sidebar
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // localStorage 차단 환경에서도 노출 (1회만 보장은 못 하지만 기능 작동)
    }
    setStepIdx(0);
  }, []);

  // 외부 trigger (예: 더보기 메뉴 "가이드 다시 보기")
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      setStepIdx(0);
    };
    window.addEventListener("pm:coach-mark:start", handler);
    return () => window.removeEventListener("pm:coach-mark:start", handler);
  }, []);

  // 자동 시작 — mount 후 1초 지연 (layout 안정화)
  useEffect(() => {
    const t = setTimeout(start, 1000);
    return () => clearTimeout(t);
  }, [start]);

  // anchor 위치 측정 — step 변경, resize, scroll 시 갱신
  useEffect(() => {
    if (stepIdx === null) return;
    const measure = () => {
      const step = STEPS[stepIdx];
      const el = document.querySelector(`[data-coach-id="${step.coachId}"]`);
      if (!el) {
        // 햄버거가 안 보이는 경우(예: 데스크톱) 스킵
        finish();
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setStepIdx(null);
    setRect(null);
  }

  function next() {
    if (stepIdx === null) return;
    if (stepIdx + 1 >= STEPS.length) {
      finish();
    } else {
      setStepIdx(stepIdx + 1);
    }
  }

  function skip() {
    finish();
  }

  if (!mounted || stepIdx === null) return null;
  if (!rect) return null;

  const step = STEPS[stepIdx];
  const padding = 8;
  const spotTop = rect.top - padding;
  const spotLeft = rect.left - padding;
  const spotWidth = rect.width + padding * 2;
  const spotHeight = rect.height + padding * 2;

  // 카드 위치: anchor 기준 상하 결정
  const isAnchorAtTop = rect.top < window.innerHeight / 2;
  const cardStyle: React.CSSProperties = isAnchorAtTop
    ? { top: rect.top + rect.height + padding + 12, left: 16, right: 16 }
    : { bottom: window.innerHeight - rect.top + padding + 12, left: 16, right: 16 };

  // backdrop spotlight clipPath (사각형 hole)
  const clipPath =
    `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${spotTop}px,` +
    ` ${spotLeft}px ${spotTop}px,` +
    ` ${spotLeft}px ${spotTop + spotHeight}px,` +
    ` ${spotLeft + spotWidth}px ${spotTop + spotHeight}px,` +
    ` ${spotLeft + spotWidth}px ${spotTop}px,` +
    ` 0 ${spotTop}px)`;

  const spotlightOutlineStyle: React.CSSProperties = {
    top: spotTop,
    left: spotLeft,
    width: spotWidth,
    height: spotHeight,
    boxShadow: "0 0 0 4px hsl(var(--primary) / 0.30)",
    animation: "coach-pulse 1.6s ease-in-out infinite",
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coach-mark-title"
    >
      {/* Backdrop with spotlight cutout — clip-path으로 hole */}
      <div
        className="absolute inset-0 bg-black/70"
        style={{ clipPath }}
        onClick={skip}
      />

      {/* Spotlight 외곽선 (펄스) */}
      <div
        className="pointer-events-none absolute rounded-xl ring-2 ring-primary"
        style={spotlightOutlineStyle}
      />

      {/* 안내 카드 */}
      <div
        className="absolute rounded-2xl bg-background p-5 shadow-2xl"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-[0.18em] uppercase"
            style={{
              background: "hsl(var(--primary) / 0.15)",
              color: "hsl(var(--primary))",
            }}
          >
            {stepIdx + 1} / {STEPS.length}
          </span>
          <button
            type="button"
            onClick={skip}
            aria-label="가이드 닫기"
            className="-mr-1 -mt-1 rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 id="coach-mark-title" className="text-base font-bold leading-tight">{step.title}</h3>
        <p className="mt-1.5 text-[13.5px] text-muted-foreground leading-[1.55]">{step.description}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={skip}
            className="text-[13px] font-medium text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            건너뛰기
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-[13.5px] font-bold text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition"
          >
            {stepIdx + 1 === STEPS.length ? "끝" : "다음"}
            {stepIdx + 1 !== STEPS.length && <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes coach-pulse {
          0%, 100% { box-shadow: 0 0 0 4px hsl(var(--primary) / 0.30); }
          50% { box-shadow: 0 0 0 10px hsl(var(--primary) / 0.18); }
        }
      `}</style>
    </div>,
    document.body
  );
}
