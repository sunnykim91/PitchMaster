"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Trash2, RefreshCw, Plus } from "lucide-react";
import { apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import { useConfirm } from "@/lib/ConfirmContext";
import { useToast } from "@/lib/ToastContext";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/formatters";
import type { Role } from "@/lib/types";
import { firstOf, type JoinedRow } from "@/lib/supabaseJoins";

type PenaltyRecord = {
  id: string;
  member_id: string;
  rule_id: string;
  match_id: string | null;
  amount: number;
  date: string;
  status: string; // UNPAID, PAID, WAIVED
  note: string | null;
  users: JoinedRow<{ name: string }>;
  rule: JoinedRow<{ name: string; trigger_type: string }>;
  match: JoinedRow<{ match_date: string; opponent_name: string | null }>;
};

export type DuesPenaltyTabProps = {
  role: Role | undefined;
};

function DuesPenaltyTabInner({ role }: DuesPenaltyTabProps) {
  const [penalties, setPenalties] = useState<PenaltyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [paidExpanded, setPaidExpanded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const confirm = useConfirm();
  const { showToast } = useToast();

  // 멤버 목록 (수동 추가용)
  useEffect(() => {
    if (!isStaffOrAbove(role)) return;
    fetch("/api/members")
      .then((r) => r.json())
      .then((data) => {
        if (data.members) {
          setMembers(
            data.members
              .filter((m: { users?: { id: string; name: string } | null }) => m.users?.name)
              .map((m: { users: { id: string; name: string } }) => ({ id: m.users.id, name: m.users.name }))
          );
        }
      })
      .catch(() => {});
  }, [role]);

  // 월별 필터
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const fetchPenalties = useCallback(() => {
    setLoading(true);
    fetch(`/api/dues/penalties?month=${monthFilter}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.penalties) setPenalties(data.penalties);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [monthFilter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPenalties(); }, [fetchPenalties]);

  function prevMonth() {
    const [y, m] = monthFilter.split("-").map(Number);
    const prev = new Date(y, m - 2);
    setMonthFilter(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
  }

  function nextMonth() {
    const [y, m] = monthFilter.split("-").map(Number);
    const next = new Date(y, m);
    setMonthFilter(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  }

  async function handleStatusChange(id: string, status: string) {
    const { error } = await apiMutate("/api/dues/penalties", "PUT", { id, status });
    if (!error) {
      setPenalties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p))
      );
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "벌금 기록을 삭제할까요?",
      description: "삭제된 벌금 기록은 복구할 수 없습니다.",
      variant: "destructive",
      confirmLabel: "삭제",
    });
    if (!ok) return;
    const { error } = await apiMutate(`/api/dues/penalties?id=${id}`, "DELETE", {});
    if (!error) {
      setPenalties((prev) => prev.filter((p) => p.id !== id));
    }
  }

  async function handleSyncPayments() {
    setSyncing(true);
    const { data, error } = await apiMutate("/api/dues/penalties/sync", "POST", {});
    setSyncing(false);
    if (error) {
      showToast("납부 확인 중 오류가 발생했습니다", "error");
      return;
    }
    const matched = (data as { matched?: number; message?: string })?.matched ?? 0;
    if (matched > 0) {
      showToast(`${matched}건 납부 확인 완료`, "success");
      fetchPenalties();
    } else {
      showToast("매칭 가능한 입금 내역이 없습니다", "info");
    }
  }

  async function handleManualAdd(formData: FormData) {
    const memberId = String(formData.get("memberId") || "");
    const amount = Number(formData.get("amount") || 0);
    const note = String(formData.get("note") || "").trim();
    if (!memberId || amount <= 0) {
      showToast("멤버와 금액을 입력해주세요", "error");
      return;
    }
    const { error } = await apiMutate("/api/dues/penalties", "POST", { manual: true, memberId, amount, note });
    if (!error) {
      setAdding(false);
      fetchPenalties();
      showToast("벌금 추가 완료", "success");
    } else {
      showToast("벌금 추가 실패", "error");
    }
  }

  const [yy, mm] = monthFilter.split("-").map(Number);
  const displayMonth = yy !== new Date().getFullYear() ? `${yy}. ${mm}월` : `${mm}월`;

  const unpaid = penalties.filter((p) => p.status === "UNPAID");
  const paid = penalties.filter((p) => p.status === "PAID");
  const waived = penalties.filter((p) => p.status === "WAIVED");
  const totalUnpaid = unpaid.reduce((s, p) => s + p.amount, 0);

  const TRIGGER_ICON: Record<string, string> = {
    LATE: "⏰",
    ABSENT: "❌",
    NO_VOTE: "🗳️",
    CUSTOM: "📋",
  };

  function renderRow(p: PenaltyRecord) {
    const user = firstOf(p.users);
    const rule = firstOf(p.rule);
    const match = firstOf(p.match);
    const userName = user?.name;
    const ruleName = rule?.name;
    const triggerType = rule?.trigger_type;
    const matchDate = match?.match_date;
    const opponent = match?.opponent_name;

    return (
      <Card key={p.id} className="border-white/[0.04] bg-card py-2">
        <CardContent className="px-4 py-0">
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
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn(
                "text-sm font-bold tabular-nums",
                p.status === "UNPAID" ? "text-[hsl(var(--loss))]" : "text-muted-foreground"
              )}>
                {formatAmount(p.amount)}
              </span>
              {isStaffOrAbove(role) ? (
                <>
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
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="text-muted-foreground/50 hover:text-destructive transition-colors p-0.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
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
      {/* 월 선택 + 수동 추가 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[4rem] text-center text-sm font-semibold text-foreground">{displayMonth}</span>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        {isStaffOrAbove(role) && !adding && (
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> 수동 추가
          </Button>
        )}
      </div>

      {/* 수동 추가 폼 */}
      {adding && (
        <Card className="border-primary/20 bg-card p-3">
          <form action={handleManualAdd} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">멤버</Label>
                <NativeSelect name="memberId" required className="h-9 text-sm">
                  <option value="">선택</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">금액</Label>
                <Input name="amount" type="number" min={0} required placeholder="5000" className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">사유 (선택)</Label>
              <Input name="note" placeholder="예: 회식 불참" className="h-9 text-sm" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>취소</Button>
              <Button type="submit" size="sm">추가</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : penalties.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title={`${displayMonth} 벌금 기록이 없습니다`}
          description="지각·불참 자동 부과 규칙 템플릿을 한 번만 적용하면 출석 체크할 때마다 자동 생성돼요."
        />
      ) : (
        <>
          {/* 미납 총액 + 납부 확인 버튼 */}
          {totalUnpaid > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-[hsl(var(--loss)/0.08)] px-4 py-3">
              <div>
                <span className="text-sm text-[hsl(var(--loss))]">미납 벌금</span>
                <span className="text-lg font-bold text-[hsl(var(--loss))] ml-2">{formatAmount(totalUnpaid)}</span>
              </div>
              {isStaffOrAbove(role) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-[hsl(var(--loss))]/30 text-[hsl(var(--loss))] hover:bg-[hsl(var(--loss))]/10"
                  disabled={syncing}
                  onClick={handleSyncPayments}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                  {syncing ? "확인 중..." : "납부 확인"}
                </Button>
              )}
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
        </>
      )}
    </div>
  );
}

export const DuesPenaltyTab = React.memo(DuesPenaltyTabInner);
