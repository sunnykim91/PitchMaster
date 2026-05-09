"use client";

/**
 * PlayerPicker — 칩 그리드 + 검색 input으로 선수 1명 선택
 *
 * 기존 native select를 대체. 인원 많은 팀(20~50명+)에서 select 스크롤 부담을 해소.
 * 50대 사용자 친화: 칩 1탭 선택, 검색 input으로 빠른 필터.
 *
 * Form 통합: hidden input으로 value 전달 (native form + FormData 호환).
 * 외부에서 defaultValue 변경 시 key prop으로 리마운트 트리거 권장.
 */

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlayerPickerOption = { id: string; name: string };
export type PlayerPickerGroup = {
  label: string;
  players: PlayerPickerOption[];
  tone?: "default" | "guest" | "special";
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

  const handleSelect = (value: string) => {
    setSelected(value);
    onChange?.(value);
  };

  const filterPlayer = (p: PlayerPickerOption) => {
    if (!query.trim()) return true;
    return p.name.toLowerCase().includes(query.trim().toLowerCase());
  };

  // 전체 인원수 — 검색 input 노출 여부 결정 (8명 이하면 검색 불필요)
  const totalPlayers = useMemo(
    () => groups.reduce((sum, g) => sum + g.players.length, 0),
    [groups]
  );
  const showSearch = totalPlayers > 8;

  return (
    <div className={cn("space-y-3", className)}>
      <input type="hidden" name={name} value={selected} />

      {showSearch && (
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
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-secondary-foreground/10"
              aria-label="검색어 지우기"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

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
  tone?: "default" | "guest" | "special" | "muted";
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
        case "muted":
          return "bg-foreground text-background border-foreground";
        default:
          return "bg-primary text-primary-foreground border-primary shadow-sm";
      }
    }
    switch (tone) {
      case "guest":
        return "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))] border-[hsl(var(--info))]/30 hover:border-[hsl(var(--info))]/60";
      case "special":
        return "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30 hover:border-[hsl(var(--warning))]/60";
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
