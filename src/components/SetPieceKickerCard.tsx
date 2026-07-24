"use client";

import { useState } from "react";
import { ChevronDown, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { SET_PIECE_ROLES, type SetPieces, type SetPieceRole } from "./TacticsBoard.types";

type PlayerLite = { id: string; name: string };

type Props = {
  /** 현재 쿼터의 세트피스 지정 (role → playerId) */
  setPieces: SetPieces;
  /** 이 쿼터에 실제 배치돼 키커 후보가 되는 선수들 */
  quarterPlayers: PlayerLite[];
  /** 이름 해석 폴백 — 지정된 키커가 배치에서 빠졌을 때도 이름 표시용 */
  roster: PlayerLite[];
  onAssign: (role: SetPieceRole, playerId: string) => void;
};

/**
 * 전술판 "세트피스 키커" 접이식 카드 (STAFF+ 편집용).
 * 쿼터마다 프리킥·좌/우 코너킥·페널티킥 키커를 각각 지정 (자동 승계 없음 — 옵션 1).
 * 후보 목록은 "이 쿼터에 뛰는 선수"로 제한 (주심/촬영과 반대).
 */
export default function SetPieceKickerCard({ setPieces, quarterPlayers, roster, onAssign }: Props) {
  const [open, setOpen] = useState(false);
  const assignedCount = SET_PIECE_ROLES.filter((r) => setPieces[r.key]).length;

  return (
    <Card className="border-0 bg-secondary">
      <CardContent className="p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Flag className="h-4 w-4 text-muted-foreground" />
            세트피스 키커
            {assignedCount > 0 && (
              <span className="rounded-full bg-[hsl(var(--primary)_/_0.15)] px-2 py-0.5 text-[11px] font-bold text-primary">
                {assignedCount}
              </span>
            )}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="mt-3 space-y-3">
            <p className="text-[12px] text-muted-foreground">
              이 쿼터에 뛰는 선수 중에서 골라요. 쿼터마다 따로 지정됩니다.
            </p>
            {quarterPlayers.length === 0 && (
              <p className="rounded-lg bg-[hsl(var(--warning)_/_0.12)] px-3 py-2 text-[12px] font-medium text-[hsl(var(--warning))]">
                먼저 이 쿼터에 선수를 배치하면 키커를 지정할 수 있어요.
              </p>
            )}
            {SET_PIECE_ROLES.map(({ key, label }) => {
              const current = setPieces[key] ?? "";
              // 현재 지정된 선수가 쿼터 배치에서 빠졌어도 옵션에 유지 (referee 패턴)
              const currentPlayer =
                current && !quarterPlayers.some((p) => p.id === current)
                  ? roster.find((r) => r.id === current)
                  : null;
              const options = currentPlayer ? [currentPlayer, ...quarterPlayers] : quarterPlayers;
              return (
                <div key={key} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                  <select
                    value={current}
                    onChange={(e) => onAssign(key, e.target.value)}
                    disabled={quarterPlayers.length === 0 && !current}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <option value="">미지정</option>
                    {options.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
