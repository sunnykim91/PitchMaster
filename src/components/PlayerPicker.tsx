"use client";

/**
 * PlayerPicker — 칩 그리드 + 검색 input으로 선수 1명 선택
 *
 * 기존 native select를 대체. 인원 많은 팀(20~50명+)에서 select 스크롤 부담을 해소.
 * 50대 사용자 친화: 칩 1탭 선택, 검색 input으로 빠른 필터.
 *
 * UX 흐름:
 * - 미선택: 검색 input + 칩 그리드 펼침
 * - 선택됨: 한 줄 (선택된 이름 + 변경 버튼) — 폼 길이 단축
 * - "변경" 누르면 다시 펼침
 *
 * Form 통합: hidden input으로 value 전달 (native form + FormData 호환).
 * 외부에서 defaultValue 변경 시 key prop으로 리마운트 트리거 권장.
 */

import { useRef, useState } from "react";
import { Search, X, Check, ChevronDown, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlayerPickerOption = { id: string; name: string };
export type PlayerPickerGroup = {
  label: string;
  players: PlayerPickerOption[];
  tone?: "default" | "guest" | "special" | "success" | "muted";
};

export interface PlayerPickerProps {
  /** form FormData에서 읽을 hidden input name */
  name: string;
  /** 초기 선택값 (id) */
  defaultValue?: string;
  /** 그룹별 선수 목록 */
  groups: PlayerPickerGroup[];
  /** 미선택 옵션 라벨 — null이면 미선택 칩 숨김 */
  emptyLabel?: string | null;
  /** 미선택 칩 value (기본 "") */
  emptyValue?: string;
  /** 검색 placeholder */
  searchPlaceholder?: string;
  className?: string;
  onChange?: (value: string) => void;
}

export function PlayerPicker({
  name,
  defaultValue = "",
  groups,
  emptyLabel = "선택 안함",
  emptyValue = "",
  searchPlaceholder = "이름 검색…",
  className,
  onChange,
}: PlayerPickerProps) {
  const [selected, setSelected] = useState(defaultValue);
  const [query, setQuery] = useState("");
  // 미선택 상태에서는 펼침, 선택됐으면 접힘
  const [expanded, setExpanded] = useState(!defaultValue);
  const containerRef = useRef<HTMLDivElement>(null);

  // "변경" 등 사용자가 직접 펼칠 때만 살짝 스크롤해 칩 그리드를 화면에 보여줌
  // (초기 마운트·key 리마운트에는 호출 안 함 — 폼 진입 시 자동 스크롤 방지)
  const expand = () => {
    setExpanded(true);
    requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const handleSelect = (value: string) => {
    setSelected(value);
    onChange?.(value);
    // 빈값(미선택)이 아닌 실 선택이면 자동 접힘
    if (value !== emptyValue) {
      setExpanded(false);
      setQuery("");
    }
  };

  const filterPlayer = (p: PlayerPickerOption) => {
    if (!query.trim()) return true;
    return p.name.toLowerCase().includes(query.trim().toLowerCase());
  };

  // 선택된 항목 이름 찾기
  const selectedName = (() => {
    if (!selected || selected === emptyValue) return null;
    for (const g of groups) {
      const p = g.players.find((p) => p.id === selected);
      if (p) return { name: p.name, tone: g.tone ?? "default" };
    }
    return null;
  })();

  // 접힘 상태: 선택된 칩 + 변경 버튼 한 줄
  if (!expanded && selectedName) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <input type="hidden" name={name} value={selected} />
        <ChipButton
          selected
          onClick={expand}
          tone={selectedName.tone}
        >
          <Check className="w-3.5 h-3.5 mr-1 inline" />
          {selectedName.name}
        </ChipButton>
        <button
          type="button"
          onClick={expand}
          className="inline-flex items-center gap-1 h-9 px-3.5 rounded-full border border-border bg-secondary text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground active:scale-[0.97]"
        >
          <Pencil className="h-3 w-3" />
          변경
        </button>
      </div>
    );
  }

  // 펼침 상태: 검색 + 칩 그리드
  return (
    <div ref={containerRef} className={cn("space-y-3", className)}>
      <input type="hidden" name={name} value={selected} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-11 w-full rounded-xl border border-border bg-secondary pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="선수 이름 검색"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-[hsl(var(--secondary-foreground)_/_0.1)]"
            aria-label="검색어 지우기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : selectedName ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-[hsl(var(--secondary-foreground)_/_0.1)]"
            aria-label="목록 접기"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {emptyLabel !== null && (
        <div className="flex flex-wrap gap-2">
          <ChipButton
            selected={selected === emptyValue}
            onClick={() => handleSelect(emptyValue)}
            tone="muted"
          >
            {emptyLabel}
          </ChipButton>
        </div>
      )}

      {groups.map((group) => {
        const filtered = group.players.filter(filterPlayer);
        if (filtered.length === 0) return null;
        return (
          <div key={group.label} className="space-y-1.5">
            <p className="text-[12.5px] font-medium text-muted-foreground">
              {group.label} <span className="text-muted-foreground/60">({filtered.length})</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {filtered.map((p) => (
                <ChipButton
                  key={p.id}
                  selected={selected === p.id}
                  onClick={() => handleSelect(p.id)}
                  tone={group.tone ?? "default"}
                >
                  {p.name}
                </ChipButton>
              ))}
            </div>
          </div>
        );
      })}

      {query && groups.every((g) => g.players.filter(filterPlayer).length === 0) && (
        <p className="text-center text-sm text-muted-foreground py-3">
          “{query}” 검색 결과 없음
        </p>
      )}
    </div>
  );
}

interface ChipButtonProps {
  selected: boolean;
  onClick: () => void;
  tone?: "default" | "guest" | "special" | "success" | "muted";
  children: React.ReactNode;
}

function ChipButton({ selected, onClick, tone = "default", children }: ChipButtonProps) {
  const toneClass = (() => {
    if (selected) {
      switch (tone) {
        case "guest":
          return "bg-[hsl(var(--info))] text-white border-[hsl(var(--info))]";
        case "special":
          return "bg-[hsl(var(--warning))] text-[hsl(0_0%_10%)] border-[hsl(var(--warning))]";
        case "success":
          return "bg-[hsl(var(--success))] text-white border-[hsl(var(--success))] shadow-sm";
        case "muted":
          return "bg-foreground text-background border-foreground";
        default:
          return "bg-primary text-primary-foreground border-primary shadow-sm";
      }
    }
    switch (tone) {
      case "guest":
        return "bg-[hsl(var(--info)_/_0.1)] text-[hsl(var(--info))] border-[hsl(var(--info))]/30 hover:border-[hsl(var(--info))]/60";
      case "special":
        return "bg-[hsl(var(--warning)_/_0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30 hover:border-[hsl(var(--warning))]/60";
      case "success":
        return "bg-[hsl(var(--success)_/_0.1)] text-[hsl(var(--success))] border-[hsl(var(--success))]/30 hover:border-[hsl(var(--success))]/60";
      case "muted":
        return "bg-secondary text-muted-foreground border-border hover:border-muted-foreground/40";
      default:
        return "bg-secondary text-foreground border-border hover:border-primary/50";
    }
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[40px] px-3.5 rounded-full text-sm font-medium border transition-colors active:scale-[0.97]",
        toneClass
      )}
      aria-pressed={selected}
    >
      {children}
    </button>
  );
}
