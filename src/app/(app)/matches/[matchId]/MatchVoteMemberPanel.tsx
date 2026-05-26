"use client";

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RosterPlayer } from "./matchDetailTypes";

type ExemptionInfo = { type: string; reason: string | null; endDate: string | null };
const DORMANT_LABEL: Record<string, string> = { INJURED: "부상", PERSONAL: "개인사정", OTHER: "기타" };
const DORMANT_ICON: Record<string, string> = { INJURED: "🏥", PERSONAL: "✈️", OTHER: "❓" };

export interface MatchVoteMemberPanelProps {
  baseRoster: RosterPlayer[];
  attend: RosterPlayer[];
  absent: RosterPlayer[];
  maybe: RosterPlayer[];
  noVote: RosterPlayer[];
  exemptions: Record<string, ExemptionInfo>;
}

function MatchVoteMemberPanelInner({
  baseRoster,
  attend,
  absent,
  maybe,
  noVote,
  exemptions,
}: MatchVoteMemberPanelProps) {
  const dormantIds = new Set(Object.keys(exemptions));

  return (
    <Card className="rounded-xl border-border/30">
      <CardContent className="space-y-5 p-5">
        {([
          { items: attend, label: "참석", color: "success" },
          { items: maybe, label: "미정", color: "warning" },
          { items: absent, label: "불참", color: "loss" },
          { items: noVote, label: "미투표", color: null },
        ]).filter(({ items }) => items.length > 0).map(({ items, label, color }) => (
          <div key={label}>
            <div className="mb-2 flex items-center gap-2">
              {color && <div className={`h-2 w-2 rounded-full bg-[hsl(var(--${color}))]`} />}
              {!color && <div className="h-2 w-2 rounded-full bg-muted-foreground" />}
              <span className="text-sm font-semibold">{label}</span>
              <Badge variant="secondary" className="text-xs">{items.length}</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {items.map((m) => (
                <Badge key={m.id} className={cn("border-0 font-medium",
                  color ? `bg-[hsl(var(--${color}))]/15 text-[hsl(var(--${color}))]` : "bg-secondary text-muted-foreground"
                )}>{m.name}</Badge>
              ))}
            </div>
          </div>
        ))}
        {/* 휴면 회원 */}
        {dormantIds.size > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              <span className="text-sm font-semibold text-muted-foreground">휴면</span>
              <Badge variant="secondary" className="text-xs">{dormantIds.size}</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {baseRoster.filter((m) => dormantIds.has(m.id)).map((m) => {
                const info = exemptions[m.id];
                return (
                  <Badge key={m.id} className="border-0 font-medium bg-secondary/50 text-muted-foreground/60">
                    {DORMANT_ICON[info?.type] ?? ""} {m.name}
                    {info?.type && <span className="ml-1 text-[12px]">({DORMANT_LABEL[info.type] ?? "휴면"})</span>}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const MatchVoteMemberPanel = memo(MatchVoteMemberPanelInner);
export default MatchVoteMemberPanel;
