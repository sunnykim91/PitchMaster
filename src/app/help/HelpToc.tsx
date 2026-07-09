"use client";

import { useEffect, useState } from "react";

/** /help 섹션 목록 — page.tsx 의 section id·상단 TOC 라벨과 1:1 일치시킬 것. */
const SECTIONS: readonly [string, string][] = [
  ["start", "1. 가입하기"],
  ["team", "2. 팀 만들기 · 초대"],
  ["match-flow", "3. 경기 운영 흐름"],
  ["vote", "4. 참석 투표"],
  ["attendance", "5. 출석 체크"],
  ["lineup", "6. 전술 편성"],
  ["tactics-video", "7. 전술 영상"],
  ["record", "8. 경기 기록 · 통계"],
  ["dues", "9. 회비 관리"],
  ["prepay", "10. 회비 선납"],
  ["monthly", "11. 월별 결산"],
  ["ai", "12. AI·자동화 기능"],
  ["more", "13. 게시판 · 멤버 외"],
  ["pwa", "14. 홈 화면 추가"],
  ["faq", "15. FAQ"],
  ["contact", "16. 문의 · 피드백"],
];

/**
 * PC(≥lg) 전용 sticky 목차 사이드바 + 스크롤 위치 하이라이트.
 * 모바일은 page.tsx 상단의 그리드 TOC(lg:hidden)를 그대로 쓰므로 여기선 hidden lg:block 로 숨김.
 */
export default function HelpToc({ className = "" }: { className?: string }) {
  const [active, setActive] = useState<string>(SECTIONS[0][0]);

  useEffect(() => {
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (els.length === 0) return;

    // 뷰포트 상단 10~30% 밴드에 걸친 섹션 중 가장 위쪽을 현재 위치로.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <aside className={className}>
      <nav
        aria-label="사용법 목차"
        className="lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto"
      >
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          목차
        </p>
        <ul className="border-l border-border/60">
          {SECTIONS.map(([id, label]) => {
            const isActive = active === id;
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={isActive ? "location" : undefined}
                  className={`-ml-px block border-l-2 py-1.5 pl-4 text-sm leading-snug transition-colors ${
                    isActive
                      ? "border-primary font-semibold text-primary"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
