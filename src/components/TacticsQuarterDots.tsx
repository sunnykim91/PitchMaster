import { cn } from "@/lib/utils";
import { formatQuarterTotal } from "./TacticsBoard.utils";

type QuarterPlayType = "full" | "first" | "second";

interface QuarterDotsProps {
  /** 표시할 쿼터 번호 목록 (예: [1,2,3,4]) */
  quarters: number[];
  /** 선수의 쿼터별 출전 타입 맵 */
  qTypeMap: Map<number, QuarterPlayType> | undefined;
  /** 현재 편집 중인 쿼터 (링으로 강조) */
  activeQuarter: number;
  className?: string;
}

/**
 * 선수의 쿼터별 출전을 작은 점으로 표시.
 * ● 풀출전(full) · ◐ 반쿼터(first/second, 전·후 교대) · ○ 쉼
 * 왼쪽부터 1쿼터 순서. 현재 편집 중인 쿼터는 링으로 강조.
 * Safari color-mix 이슈 회피를 위해 채움은 inline style(hsl) 사용.
 */
export function QuarterDots({ quarters, qTypeMap, activeQuarter, className }: QuarterDotsProps) {
  return (
    <span className={cn("flex items-center gap-1", className)} aria-hidden>
      {quarters.map((q) => {
        const type = qTypeMap?.get(q);
        const ring = q === activeQuarter ? "ring-2 ring-primary/50" : "";
        if (type === "full") {
          return (
            <span
              key={q}
              className={cn("h-2.5 w-2.5 rounded-full", ring)}
              style={{ background: "hsl(var(--primary))" }}
            />
          );
        }
        if (type === "first" || type === "second") {
          // 반쿼터: 왼쪽 절반만 채운 반달
          return (
            <span
              key={q}
              className={cn("h-2.5 w-2.5 rounded-full border border-primary/50", ring)}
              style={{ backgroundImage: "linear-gradient(90deg, hsl(var(--primary)) 50%, transparent 50%)" }}
            />
          );
        }
        // 쉼
        return (
          <span key={q} className={cn("h-2.5 w-2.5 rounded-full border border-muted-foreground/30", ring)} />
        );
      })}
    </span>
  );
}

/** 도트 의미를 설명하는 한 줄 범례 */
export function QuarterDotsLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground", className)}>
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(var(--primary))" }} />
        풀출전
      </span>
      <span className="flex items-center gap-1">
        <span
          className="h-2.5 w-2.5 rounded-full border border-primary/50"
          style={{ backgroundImage: "linear-gradient(90deg, hsl(var(--primary)) 50%, transparent 50%)" }}
        />
        반쿼터(전·후 교대)
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-full border border-muted-foreground/30" />쉼
      </span>
    </div>
  );
}

// 합계 표기는 utils의 formatQuarterTotal 재사용 (도트 소비처에서 함께 import 편의)
export { formatQuarterTotal };
