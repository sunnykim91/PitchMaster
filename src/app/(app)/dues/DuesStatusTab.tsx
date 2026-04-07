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

// ── 납부현황 목록 (미납→면제→납부 그룹, 납부자 접기) ──
function DuesStatusList({ duesStatus, role, monthFilter, refetchPaymentStatus, settings }: {
  duesStatus: DuesStatusMember[];
  role?: Role;
  monthFilter: string;
  refetchPaymentStatus: () => Promise<unknown>;
  settings: DuesSetting[];
}) {
  const [paidExpanded, setPaidExpanded] = useState(false);
  const unpaid = duesStatus.filter((m) => m.status === "UNPAID");
  const exempt = duesStatus.filter((m) => m.status === "EXEMPT");
  const paid = duesStatus.filter((m) => m.status === "PAID");

  // 회비 유형별 금액 조회 (memberType 기준)
  function getSettingAmount(memberType: string): number | null {
    const s = settings.find((s) => s.memberType === memberType);
    return s ? s.monthlyAmount : null;
  }

  async function handleStatusChange(m: DuesStatusMember, newStatus: "PAID" | "UNPAID" | "EXEMPT") {
    await apiMutate("/api/dues/payment-status", "POST", {
      memberId: m.id,
      month: monthFilter,
      status: newStatus,
      paidAmount: newStatus === "PAID" ? m.paidAmount : 0,
    });
    await refetchPaymentStatus();
  }

  function renderCard(m: DuesStatusMember) {
    const feeLabel = ROLE_LABEL[m.role] ?? null;
    // 미납 시 표시할 금액: 해당 회비설정의 금액 or paidAmount
    const unpaidAmount = getSettingAmount(m.role);

    return (
      <Card
        key={m.id}
        className="border-white/[0.04] bg-card py-3 hover:bg-secondary/50 transition-colors"
      >
        <CardContent className="px-4">
          {/* Row 1: 이름 + 역할 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">{m.name}</span>
            {feeLabel && (
              <span className="text-[11px] text-muted-foreground shrink-0">{feeLabel}</span>
            )}
          </div>

          {/* Row 2: 금액 + 뱃지 + Select */}
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-2 min-w-0">
              {/* 금액 표시 */}
              {m.status === "PAID" && m.paidAmount > 0 && (
                <span className="text-sm text-muted-foreground tabular-nums">
                  {m.paidAmount.toLocaleString()}원
                </span>
              )}
              {m.status === "UNPAID" && unpaidAmount != null && (
                <span className="text-sm font-medium tabular-nums" style={{ color: "hsl(0, 65%, 60%)" }}>
                  {unpaidAmount.toLocaleString()}원
                </span>
              )}
              {m.status === "EXEMPT" && m.note && (
                <span className="text-xs text-muted-foreground italic truncate">{m.note}</span>
              )}
              {/* 상태 뱃지 */}
              {m.status === "PAID" && (
                <Badge variant="success" className="border-0 text-[10px] px-1.5 py-0">납부 완료</Badge>
              )}
              {m.status === "UNPAID" && (
                <Badge variant="destructive" className="border-0 text-[10px] px-1.5 py-0">미납</Badge>
              )}
              {m.status === "EXEMPT" && (
                <Badge variant="warning" className="border-0 text-[10px] px-1.5 py-0">면제</Badge>
              )}
            </div>

            {/* 스태프 이상: 상태 변경 셀렉트 */}
            {isStaffOrAbove(role) && (
              <NativeSelect
                value={m.status}
                onChange={async (e) => {
                  await handleStatusChange(m, e.target.value as "PAID" | "UNPAID" | "EXEMPT");
                }}
                className={cn(
                  "h-8 w-[5.5rem] text-xs bg-card border-white/[0.06] py-0 shrink-0",
                  m.status === "EXEMPT" && "border-[hsl(var(--warning))]/40"
                )}
              >
                <option value="PAID">납부 완료</option>
                <option value="UNPAID">미납</option>
                <option value="EXEMPT">면제</option>
              </NativeSelect>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-medium text-muted-foreground">회원별 현황</p>

      {/* 미납자 (항상 펼침) */}
      {unpaid.map(renderCard)}

      {/* 면제자 */}
      {exempt.map(renderCard)}

      {/* 납부자 (접기/펼치기) */}
      {paid.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setPaidExpanded((p) => !p)}
            className="flex w-full items-center justify-between rounded-lg bg-[hsl(var(--success)/0.08)] px-3 py-2.5 text-sm font-medium text-[hsl(var(--success))] transition-colors hover:bg-[hsl(var(--success)/0.12)]"
          >
            <span>납부 완료 ({paid.length}명)</span>
            {paidExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {paidExpanded && (
            <div className="mt-2 space-y-2.5">
              {paid.map(renderCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 납부 통계 (장기 미납자 + 납부율) ──
function PaymentStats({ monthFilter, duesStatus }: {
  monthFilter: string;
  duesStatus: DuesStatusMember[];
}) {
  const [history, setHistory] = useState<{ month: string; rate: number }[]>([]);
  const [longTermUnpaid, setLongTermUnpaid] = useState<{ name: string; months: number }[]>([]);

  useEffect(() => {
    fetch(`/api/dues/payment-stats`)
      .then((r) => r.json())
      .then((data) => {
        if (data.history) setHistory(data.history);
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
      <Card className="border-white/[0.06] bg-card py-4">
        <CardContent className="px-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">납부 통계</p>
          <div className="space-y-2">
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

          {/* 월별 추이 */}
          {history.length > 1 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto">
              <span className="shrink-0">추이:</span>
              {history.map((h, i) => (
                <span key={h.month} className="shrink-0">
                  {i > 0 && <span className="mx-0.5">→</span>}
                  <span className={
                    h.rate >= 80
                      ? "text-[hsl(var(--success))]"
                      : h.rate >= 50
                      ? "text-[hsl(var(--warning))]"
                      : "text-destructive"
                  }>
                    {h.rate}%
                  </span>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 장기 미납자 경고 카드 */}
      {longTermUnpaid.length > 0 && (
        <Card className="border-destructive/20 bg-destructive/10 py-3">
          <CardContent className="px-4 flex items-start gap-3">
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
