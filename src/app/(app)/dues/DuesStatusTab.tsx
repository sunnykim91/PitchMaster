"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, RefreshCw, Users } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { isStaffOrAbove } from "@/lib/permissions";
import { apiMutate } from "@/lib/useApi";
import { useItemAction } from "@/lib/useAsyncAction";
import type { Role } from "@/lib/types";

/* ── 타입 정의 ── */

type DuesStatusMember = {
  id: string;
  memberId: string;
  name: string;
  role: string;
  paidAmount: number;
  status: "PAID" | "UNPAID" | "EXEMPT";
  note?: string;
};

type DuesSetting = {
  id: string;
  memberType: string;
  monthlyAmount: number;
  description: string;
};

type DuesTabKey = "records" | "status" | "bulk" | "settings";

export type DuesStatusTabProps = {
  role: Role | undefined;
  monthFilter: string;
  setMonthFilter: (v: string) => void;
  duesStatus: DuesStatusMember[];
  settings: DuesSetting[];
  loadingPaymentStatus: boolean;
  membersCount: number;
  periodConfig: { id?: string; startDay: number };
  getDuesPeriod: (month: string, startDay: number) => { from: string; to: string };
  refetchPaymentStatus: () => Promise<void>;
  syncPaymentStatus: () => Promise<void>;
  setDuesTab: (tab: DuesTabKey) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
};

const ROLE_LABEL: Record<string, string> = { OWNER: "회장", MANAGER: "운영진", STAFF: "스태프" };

function DuesStatusTabInner({
  role,
  monthFilter,
  setMonthFilter,
  duesStatus,
  settings,
  loadingPaymentStatus,
  membersCount,
  periodConfig,
  getDuesPeriod,
  refetchPaymentStatus,
  syncPaymentStatus,
  setDuesTab,
  showToast,
}: DuesStatusTabProps) {
  const [sendingNudge, setSendingNudge] = useState(false);

  async function handleUnpaidNudge() {
    const unpaidMembers = duesStatus.filter((m) => m.status === "UNPAID");
    if (unpaidMembers.length === 0) return;
    const unpaidMemberIds = unpaidMembers.map((m) => m.memberId);
    setSendingNudge(true);
    const { error } = await apiMutate("/api/push/send", "POST", {
      title: "회비 납부 안내",
      body: `${monthFilter.replace("-", "년 ")}월 회비가 미납 상태입니다. 확인 부탁드립니다.`,
      url: "/dues?tab=status",
      userIds: unpaidMemberIds,
    });
    setSendingNudge(false);
    if (error) {
      showToast?.("알림 발송에 실패했습니다.", "error");
    } else {
      showToast?.(`미납자 ${unpaidMembers.length}명에게 알림을 보냈습니다.`);
    }
  }

  const [y, m] = monthFilter.split("-").map(Number);
  const displayMonth = String(m).padStart(2, "0");

  /* 회비 설정 없으면 빈 상태 */
  if (settings.length === 0) {
    return (
      <div role="tabpanel" id="tabpanel-status" aria-labelledby="tab-status">
        <EmptyState
          icon={Users}
          title="회비 설정을 먼저 완료해주세요"
          description="설정 탭에서 회비 유형과 금액을 설정해야 납부 현황을 관리할 수 있습니다."
          action={
            <button
              type="button"
              onClick={() => setDuesTab("settings")}
              className="mt-2 text-xs text-primary hover:underline"
            >
              설정으로 이동 &rarr;
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div role="tabpanel" id="tabpanel-status" aria-labelledby="tab-status" className="space-y-4">
      {/* 헤더: 월 이동 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">납부 현황</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="이전 달"
              onClick={() => {
                const prev = new Date(y, m - 2);
                setMonthFilter(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors active:scale-[0.97]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-[2.5rem] text-center text-sm font-medium text-foreground">
              {displayMonth}
            </span>
            <button
              type="button"
              aria-label="다음 달"
              onClick={() => {
                const next = new Date(y, m);
                setMonthFilter(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors active:scale-[0.97]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 기준일 안내 */}
        {periodConfig.startDay > 1 && (() => {
          const { from, to } = getDuesPeriod(monthFilter, periodConfig.startDay);
          return (
            <p className="text-xs text-muted-foreground">
              납부 기간: {from} ~ {to}
            </p>
          );
        })()}
      </div>

      {/* 액션 버튼 */}
      {isStaffOrAbove(role) && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => syncPaymentStatus()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border/40 bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors active:scale-[0.97]"
          >
            <RefreshCw className="h-4 w-4" />
            납부 자동 확인
          </button>
          <button
            type="button"
            onClick={handleUnpaidNudge}
            disabled={sendingNudge || duesStatus.filter((m) => m.status === "UNPAID").length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border/40 bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors active:scale-[0.97] disabled:opacity-50"
          >
            <Bell className="h-4 w-4" />
            {sendingNudge ? "발송 중..." : "미납 알림"}
          </button>
        </div>
      )}

      {/* 납부 통계 */}
      <PaymentStats monthFilter={monthFilter} duesStatus={duesStatus} />

      {/* 회원 목록 */}
      {loadingPaymentStatus ? (
        <div className="space-y-2.5">
          <p className="text-xs font-medium text-muted-foreground">회원별 현황</p>
          {Array.from({ length: Math.min(membersCount || 5, 10) }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : duesStatus.length === 0 ? (
        <EmptyState
          icon={Users}
          title="팀원이 없습니다"
          description="회원 관리에서 팀원을 추가하세요."
          action={<Link href="/members" className="text-xs text-primary hover:underline">회원 관리 &rarr;</Link>}
        />
      ) : (
        <DuesStatusList
          duesStatus={duesStatus}
          role={role}
          monthFilter={monthFilter}
          refetchPaymentStatus={refetchPaymentStatus}
          settings={settings}
        />
      )}
    </div>
  );
}

// ── 상태 그룹 (접기/펼치기) ──
const COLOR_MAP = {
  destructive: { bg: "bg-destructive/8", text: "text-destructive", hover: "hover:bg-destructive/12" },
  warning: { bg: "bg-[hsl(var(--warning))]/8", text: "text-[hsl(var(--warning))]", hover: "hover:bg-[hsl(var(--warning))]/12" },
  success: { bg: "bg-[hsl(var(--success))]/8", text: "text-[hsl(var(--success))]", hover: "hover:bg-[hsl(var(--success))]/12" },
} as const;

function StatusGroup<T>({ label, color, items, renderItem, defaultOpen = false }: {
  label: string;
  color: keyof typeof COLOR_MAP;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const c = COLOR_MAP[color];
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex w-full items-center justify-between rounded-lg ${c.bg} px-3 py-2 text-xs font-medium ${c.text} transition-colors ${c.hover}`}
      >
        <span>{label}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1.5">
          {items.map(renderItem)}
        </div>
      )}
    </div>
  );
}

// ── 납부현황 목록 (미납→면제→납부 그룹) ──
function DuesStatusList({ duesStatus, role, monthFilter, refetchPaymentStatus, settings }: {
  duesStatus: DuesStatusMember[];
  role?: Role;
  monthFilter: string;
  refetchPaymentStatus: () => Promise<unknown>;
  settings: DuesSetting[];
}) {
  const [runFor, changingId] = useItemAction();
  const unpaid = duesStatus.filter((m) => m.status === "UNPAID");
  const exempt = duesStatus.filter((m) => m.status === "EXEMPT");
  const paid = duesStatus.filter((m) => m.status === "PAID");

  function getSettingAmount(memberType: string): number | null {
    const s = settings.find((s) => s.memberType === memberType);
    return s ? s.monthlyAmount : null;
  }

  async function handleStatusChange(m: DuesStatusMember, newStatus: "PAID" | "UNPAID" | "EXEMPT") {
    await runFor(m.memberId, async () => {
      await apiMutate("/api/dues/payment-status", "POST", {
        memberId: m.memberId,
        month: monthFilter,
        status: newStatus,
        paidAmount: newStatus === "PAID" ? m.paidAmount : 0,
      });
      await refetchPaymentStatus();
    });
  }

  function renderCard(m: DuesStatusMember) {
    const feeLabel = ROLE_LABEL[m.role] ?? null;
    // 미납 시 표시할 금액: 해당 회비설정의 금액 or paidAmount
    const unpaidAmount = getSettingAmount(m.role);

    return (
      <Card
        key={m.id}
        className="border-white/[0.04] bg-card py-1.5"
      >
        <CardContent className="px-3 pb-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-sm font-semibold text-foreground truncate">{m.name}</span>
              {m.status === "PAID" && (
                <Badge variant="success" className="border-0 text-[10px] px-1.5 py-0 shrink-0">납부</Badge>
              )}
              {m.status === "UNPAID" && (
                <Badge variant="destructive" className="border-0 text-[10px] px-1.5 py-0 shrink-0">미납</Badge>
              )}
              {m.status === "EXEMPT" && (
                <Badge variant="warning" className="border-0 text-[10px] px-1.5 py-0 shrink-0">면제</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {m.status === "PAID" && m.paidAmount > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">{m.paidAmount.toLocaleString()}원</span>
              )}
              {m.status === "UNPAID" && unpaidAmount != null && (
                <span className="text-xs font-medium tabular-nums" style={{ color: "hsl(0, 65%, 60%)" }}>{unpaidAmount.toLocaleString()}원</span>
              )}
              {isStaffOrAbove(role) && (
                changingId === m.memberId ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary shrink-0" />
                ) : (
                  <NativeSelect
                    value={m.status}
                    disabled={!!changingId}
                    onChange={async (e) => { await handleStatusChange(m, e.target.value as "PAID" | "UNPAID" | "EXEMPT"); }}
                    className={cn(
                      "h-7 w-[5rem] text-[11px] bg-card border-white/[0.06] py-0",
                      m.status === "EXEMPT" && "border-[hsl(var(--warning))]/40",
                      changingId && "opacity-50"
                    )}
                  >
                    <option value="PAID">납부</option>
                    <option value="UNPAID">미납</option>
                    <option value="EXEMPT">면제</option>
                  </NativeSelect>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">회원별 현황</p>

      {/* 미납자 그룹 */}
      {unpaid.length > 0 && (
        <StatusGroup
          label={`미납 (${unpaid.length}명)`}
          color="destructive"
          items={unpaid}
          renderItem={renderCard}
          defaultOpen
        />
      )}

      {/* 면제자 그룹 */}
      {exempt.length > 0 && (
        <StatusGroup
          label={`면제 (${exempt.length}명)`}
          color="warning"
          items={exempt}
          renderItem={renderCard}
        />
      )}

      {/* 납부자 그룹 */}
      {paid.length > 0 && (
        <StatusGroup
          label={`납부 완료 (${paid.length}명)`}
          color="success"
          items={paid}
          renderItem={renderCard}
        />
      )}
    </div>
  );
}

// ── 납부 통계 (장기 미납자 + 납부율) ──
function PaymentStats({ monthFilter, duesStatus }: {
  monthFilter: string;
  duesStatus: DuesStatusMember[];
}) {
  const [longTermUnpaid, setLongTermUnpaid] = useState<{ name: string; months: number }[]>([]);

  useEffect(() => {
    fetch(`/api/dues/payment-stats`)
      .then((r) => r.json())
      .then((data) => {
        if (data.longTermUnpaid) setLongTermUnpaid(data.longTermUnpaid);
      })
      .catch(() => {});
  }, [monthFilter]);

  // 현재 월 납부율
  const exempt = duesStatus.filter((m) => m.status === "EXEMPT").length;
  const total = duesStatus.length - exempt;
  const paid = duesStatus.filter((m) => m.status === "PAID").length;
  const unpaid = duesStatus.filter((m) => m.status === "UNPAID").length;
  const rate = total > 0 ? Math.round((paid / total) * 100) : 0;

  if (duesStatus.length === 0) return null;

  return (
    <>
      {/* 납부 통계 카드 */}
      <Card className="border-white/[0.06] bg-card py-2.5">
        <CardContent className="px-4 pb-0 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">납부 통계</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div
                className="flex-1 h-3 rounded-full overflow-hidden"
                style={{ backgroundColor: "hsl(0, 0%, 15%)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${rate}%`,
                    backgroundColor: "hsl(152, 55%, 55%)",
                    backgroundImage: "none",
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-foreground min-w-[3rem] text-right">
                {rate}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-[hsl(var(--success))] font-medium">납부 {paid}명</span>
              {" · "}
              <span className="text-destructive font-medium">미납 {unpaid}명</span>
              {" · "}
              <span className="text-[hsl(var(--warning))] font-medium">면제 {exempt}명</span>
            </p>
          </div>

        </CardContent>
      </Card>

      {/* 장기 미납자 경고 카드 */}
      {longTermUnpaid.length > 0 && (
        <Card className="border-destructive/20 bg-destructive/10 py-2">
          <CardContent className="px-3 pb-0 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium text-destructive">장기 미납자</p>
              <p className="text-xs text-destructive/90">
                {longTermUnpaid.map((u, i) => (
                  <span key={u.name}>
                    {u.name} <span className="font-bold">({u.months}개월)</span>
                    {i < longTermUnpaid.length - 1 ? ", " : ""}
                  </span>
                ))}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export const DuesStatusTab = React.memo(DuesStatusTabInner);
