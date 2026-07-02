import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { formatQuarterTotal } from "./TacticsBoard.utils";

type QuarterPlayType = "full" | "first" | "second";
export type RosterSort = "name" | "quarter";

// 채움=코랄(밝음), 쉼=회색(은은). 대비를 위해 빈 칸도 속을 채운다.
// Safari color-mix 이슈 회피를 위해 inline style(hsl)만 사용.
const FILL = "hsl(var(--primary))";
const REST = "hsl(var(--muted-foreground) / 0.32)";

function dotStyle(type: QuarterPlayType | undefined): CSSProperties {
  if (type === "full") return { background: FILL };
  // 반쿼터: 왼쪽 절반만 코랄, 오른쪽 절반은 회색 → 명확한 반달
  if (type === "first" || type === "second")
    return { backgroundImage: `linear-gradient(90deg, ${FILL} 50%, ${REST} 50%)` };
  return { background: REST };
}

/**
 * 선수의 쿼터별 출전을 작은 점으로 표시. 왼쪽부터 1쿼터.
 * ● 풀출전 · ◐ 반쿼터(전·후 교대) · ● (회색) 쉼
 */
export function QuarterDots({
  quarters,
  qTypeMap,
  className,
}: {
  quarters: number[];
  qTypeMap: Map<number, QuarterPlayType> | undefined;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-1.5", className)} aria-hidden>
      {quarters.map((q) => (
        <span key={q} className="h-3 w-3 shrink-0 rounded-full" style={dotStyle(qTypeMap?.get(q))} />
      ))}
    </span>
  );
}

/** 도트 의미를 설명하는 한 줄 범례 */
export function QuarterDotsLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground", className)}>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full" style={dotStyle("full")} />
        풀출전
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full" style={dotStyle("first")} />
        반쿼터(전·후 교대)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full" style={dotStyle(undefined)} />
        쉼
      </span>
    </div>
  );
}

/**
 * 선수 목록 헤더: 왼쪽 정렬 토글(이름/쿼터) + 오른쪽 쿼터 번호(도트 위 정렬).
 * PlayerQuarterSummary의 우측 클러스터(w-11 칩 + 도트 + w-14 합계)와 폭이 맞아 세로로 정렬됨.
 */
export function PlayerListSortHeader({
  quarters,
  sort,
  onSort,
  className,
}: {
  quarters: number[];
  sort: RosterSort;
  onSort: (s: RosterSort) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full items-center justify-between gap-2 rounded-xl border border-transparent px-4", className)}>
      <div className="min-w-0 flex-1">
        <div className="inline-flex items-center gap-0.5 rounded-lg bg-secondary p-0.5 text-[11px]">
          {(["name", "quarter"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onSort(key)}
              className={cn(
                "rounded-md px-2 py-1 font-semibold transition-colors",
                sort === key ? "bg-primary text-white" : "text-muted-foreground"
              )}
            >
              {key === "name" ? "이름순" : "쿼터순"}
            </button>
          ))}
        </div>
      </div>
      <span className="flex shrink-0 items-center gap-2.5">
        <span className="w-11" />
        <span className="flex items-center gap-1.5" aria-hidden>
          {quarters.map((q) => (
            <span key={q} className="w-3 shrink-0 text-center text-[10px] font-bold leading-none text-muted-foreground">
              {q}
            </span>
          ))}
        </span>
        <span className="w-14 text-right text-[10px] font-bold text-muted-foreground">쿼터</span>
      </span>
    </div>
  );
}

/**
 * 선수 행 우측 요약: [상태 칩(추천/배치 포지션)] + [쿼터 도트] + [출전 합계].
 * 데스크톱 인라인 패널·모바일 바텀시트 두 곳에서 동일하게 사용 (드리프트 방지).
 */
export function PlayerQuarterSummary({
  matched,
  assignedSlotLabel,
  quarters,
  quarterCount,
  qTypeMap,
  qCount,
}: {
  matched: boolean;
  assignedSlotLabel: string | null;
  quarters: number[];
  quarterCount: number;
  qTypeMap: Map<number, QuarterPlayType> | undefined;
  qCount: number;
}) {
  return (
    <span className={cn("flex shrink-0 items-center gap-2.5 text-xs", matched ? "text-white/85" : "text-muted-foreground")}>
      {/* 상태 칩: 추천 / 배치된 포지션 — 고정폭 슬롯이라 도트가 세로로 정렬됨 */}
      <span className="flex w-11 justify-end">
        {matched ? (
          <span className="rounded-full bg-[rgb(255_255_255_/_0.2)] px-1.5 py-0.5 text-[11px] font-bold text-white">추천</span>
        ) : assignedSlotLabel ? (
          <span className="rounded-full bg-[hsl(var(--muted-foreground)_/_0.18)] px-1.5 py-0.5 text-[11px] font-bold text-foreground/70">
            {assignedSlotLabel}
          </span>
        ) : null}
      </span>
      {quarterCount > 0 && <QuarterDots quarters={quarters} qTypeMap={qTypeMap} />}
      <span
        className={cn(
          "w-14 text-right tabular-nums",
          qCount > 0 && "font-semibold",
          qCount > 0 && !matched && "text-foreground/80"
        )}
      >
        {qCount > 0 ? `${formatQuarterTotal(qCount)}쿼터` : "미출전"}
      </span>
    </span>
  );
}
