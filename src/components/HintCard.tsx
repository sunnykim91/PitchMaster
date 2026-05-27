"use client";

import { useEffect, useState } from "react";
import { X, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 첫 진입 안내 카드 — Phase 6 (68차C, 사용자 점수 친절성↑·직관성↑ 목표).
 *
 * 사용처: 핵심 운영 페이지 첫 방문 시 "여기서 뭐 하는 곳인지" 한 줄 안내.
 * localStorage 키로 dismiss 추적 — 한 번 닫으면 같은 디바이스에서는 다시 안 보임.
 *
 * 디자인 결정:
 * - 풍선·툴팁 라이브러리 X (번들 부담, 위치 계산 복잡)
 * - 단순 페이지 상단 배너 카드 — 가장 단순한 접근
 * - 50대 친화: 큰 폰트, 명확한 [X] 버튼, info(블루) 톤
 *
 * 예:
 *   <HintCard
 *     storageKey="hint:attendance"
 *     title="출석 체크"
 *     description="회원 옆 참석·지각·불참 버튼을 누르면 MVP·벌금이 자동 처리돼요"
 *   />
 */
export interface HintCardProps {
  /** localStorage 키 — "hint:" prefix 자동 추가 안 함, 호출자가 명시 */
  storageKey: string;
  title: string;
  description: string;
  /** info(기본)/warning/success — 톤 차이 */
  tone?: "info" | "warning" | "success";
  /** 사용자 강제 표시 (개발·미리보기용). true면 localStorage 무시 */
  forceShow?: boolean;
}

const TONE_CLASS: Record<NonNullable<HintCardProps["tone"]>, string> = {
  info: "border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/8 text-[hsl(var(--info))]",
  warning: "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/8 text-[hsl(var(--warning))]",
  success: "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/8 text-[hsl(var(--success))]",
};

export default function HintCard({
  storageKey,
  title,
  description,
  tone = "info",
  forceShow = false,
}: HintCardProps) {
  // SSR/CSR hydration mismatch 회피: 첫 렌더는 무조건 hidden, mount 후 localStorage 읽고 결정
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const seen = localStorage.getItem(storageKey);
      if (!seen) setVisible(true);
    } catch {
      // localStorage 차단 환경 — 안 보여줌 (오작동보다 안전)
    }
  }, [storageKey, forceShow]);

  function dismiss() {
    setVisible(false);
    if (forceShow) return;
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, "1");
    } catch { /* noop */ }
  }

  if (!visible) return null;

  return (
    <div
      role="note"
      aria-label={title}
      className={cn(
        "relative flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm",
        TONE_CLASS[tone]
      )}
    >
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
        <Info className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 pr-6">
        <p className="font-bold leading-tight text-foreground">{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-foreground/80" style={{ wordBreak: "keep-all" }}>
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="안내 닫기"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
