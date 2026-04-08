"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

type PenaltyRecord = {
  id: string;
  member_id: string;
  rule_id: string;
  match_id: string | null;
  amount: number;
  date: string;
  status: string; // UNPAID, PAID, WAIVED
  note: string | null;
  users: { name: string } | null;
  rule: { name: string; trigger_type: string } | null;
  match: { match_date: string; opponent_name: string | null } | null;
};

export type DuesPenaltyTabProps = {
  role: Role | undefined;
};

function DuesPenaltyTabInner({ role }: DuesPenaltyTabProps) {
  const [penalties, setPenalties] = useState<PenaltyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [paidExpanded, setPaidExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/dues/penalties")
      .then((r) => r.json())
      .then((data) => {
        if (data.penalties) setPenalties(data.penalties);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleStatusChange(id: string, status: string) {
    const { error } = await apiMutate("/api/dues/penalties", "PUT", { id, status });
    if (!error) {
      setPenalties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status, is_paid: status === "PAID" } : p))
      );
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  const unpaid = penalties.filter((p) => p.status === "UNPAID");
  const paid = penalties.filter((p) => p.status === "PAID");
  const waived = penalties.filter((p) => p.status === "WAIVED");
  const totalUnpaid = unpaid.reduce((s, p) => s + p.amount, 0);

  if (penalties.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="벌금 기록이 없습니다"
        description="벌금 규칙을 설정하고 경기를 완료하면 자동으로 생성됩니다."
      />
    );
  }

  const TRIGGER_ICON: Record<string, string> = {
    LATE: "⏰",
    ABSENT: "❌",
    NO_VOTE: "🗳️",
    CUSTOM: "📋",
  };

  function renderRow(p: PenaltyRecord) {
    const userName = Array.isArray(p.users) ? (p.users as unknown as { name: string }[])[0]?.name : p.users?.name;
    const ruleName = Array.isArray(p.rule) ? (p.rule as unknown as { name: string; trigger_type: string }[])[0]?.name : p.rule?.name;
    const triggerType = Array.isArray(p.rule) ? (p.rule as unknown as { trigger_type: string }[])[0]?.trigger_type : p.rule?.trigger_type;
    const matchDate = Array.isArray(p.match) ? (p.match as unknown as { match_date: string }[])[0]?.match_date : p.match?.match_date;
    const opponent = Array.isArray(p.match) ? (p.match as unknown as { opponent_name: string | null }[])[0]?.opponent_name : p.match?.opponent_name;

    return (
      <Card key={p.id} className="border-white/[0.04] bg-card py-3">
        <CardContent className="px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{TRIGGER_ICON[triggerType ?? "CUSTOM"]}</span>
                <span className="text-sm font-semibold truncate">{userName ?? "알 수 없음"}</span>
                <span className="text-xs text-muted-foreground">· {ruleName ?? "벌금"}</span>
              </div>
              {matchDate && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {matchDate} {opponent ? `vs ${opponent}` : ""}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn(
                "text-sm font-bold tabular-nums",
                p.status === "UNPAID" ? "text-[hsl(var(--loss))]" : "text-muted-foreground"
              )}>
                {p.amount.toLocaleString()}원
              </span>
              {isStaffOrAbove(role) ? (
                <NativeSelect
                  value={p.status}
                  onChange={(e) => handleStatusChange(p.id, e.target.value)}
                  className={cn(
                    "h-7 w-[4.5rem] text-[11px] py-0 bg-card border-white/[0.06]",
                    p.status === "WAIVED" && "border-[hsl(var(--warning))]/40"
                  )}
                >
                  <option value="UNPAID">미납</option>
                  <option value="PAID">납부</option>
                  <option value="WAIVED">면제</option>
                </NativeSelect>
              ) : (
                <Badge
                  variant={p.status === "PAID" ? "success" : p.status === "WAIVED" ? "warning" : "destructive"}
                  className="text-[10px] px-1.5 py-0 border-0"
                >
                  {p.status === "PAID" ? "납부" : p.status === "WAIVED" ? "면제" : "미납"}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 미납 총액 */}
      {totalUnpaid > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-[hsl(var(--loss)/0.08)] px-4 py-3">
          <span className="text-sm text-[hsl(var(--loss))]">미납 벌금</span>
          <span className="text-lg font-bold text-[hsl(var(--loss))]">{totalUnpaid.toLocaleString()}원</span>
        </div>
      )}

      {/* 미납 목록 */}
      {unpaid.length > 0 && (
        <div className="space-y-2">
          {unpaid.map(renderRow)}
        </div>
      )}

      {/* 면제 */}
      {waived.length > 0 && (
        <div className="space-y-2">
          {waived.map(renderRow)}
        </div>
      )}

      {/* 납부 완료 (접기) */}
      {paid.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setPaidExpanded((p) => !p)}
            className="flex w-full items-center justify-between rounded-lg bg-[hsl(var(--success)/0.08)] px-3 py-2.5 text-sm font-medium text-[hsl(var(--success))] transition-colors hover:bg-[hsl(var(--success)/0.12)]"
          >
            <span>납부 완료 ({paid.length}건)</span>
            {paidExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {paidExpanded && (
            <div className="mt-2 space-y-2">
              {paid.map(renderRow)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const DuesPenaltyTab = React.memo(DuesPenaltyTabInner);
