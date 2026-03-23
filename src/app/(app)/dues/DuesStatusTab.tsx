"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
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
}: DuesStatusTabProps) {
  return (
    <div role="tabpanel" id="tabpanel-status" aria-labelledby="tab-status">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="이전 달"
              onClick={() => {
                const [y, m] = monthFilter.split("-").map(Number);
                const prev = new Date(y, m - 2);
                setMonthFilter(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
              }}
              className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[80px] text-center text-sm font-bold">
              {monthFilter.replace("-", "년 ")}월
            </span>
            <button
              type="button"
              aria-label="다음 달"
              onClick={() => {
                const [y, m] = monthFilter.split("-").map(Number);
                const next = new Date(y, m);
                setMonthFilter(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
              }}
              className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const paidMembers = duesStatus.filter(m => m.status === "PAID");
              const exemptMembers = duesStatus.filter(m => m.status === "EXEMPT");
              return (
                <p className="text-xs text-muted-foreground">
                  <span className="text-[hsl(var(--success))] font-bold">{paidMembers.length}</span>
                  /{duesStatus.length - exemptMembers.length}명 납부
                </p>
              );
            })()}
            {isStaffOrAbove(role) && (
              <button
                type="button"
                onClick={() => syncPaymentStatus()}
                className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
              >
                납부 자동 확인
              </button>
            )}
          </div>
        </div>

        {/* 기준일 안내 */}
        {periodConfig.startDay > 1 && (() => {
          const { from, to } = getDuesPeriod(monthFilter, periodConfig.startDay);
          return (
            <p className="mt-1 text-xs text-muted-foreground">
              납부 기간: {from} ~ {to}
            </p>
          );
        })()}

        {/* 경고: 회비 기준 미설정 */}
        {settings.length === 0 && (
          <div className="mt-3 rounded-lg bg-[hsl(var(--warning))]/10 px-3 py-2">
            <p className="text-xs text-[hsl(var(--warning))]">
              회비 기준이 설정되지 않았습니다.{" "}
              <button type="button" onClick={() => setDuesTab("settings")} className="underline font-bold">
                설정 탭에서 추가
              </button>
            </p>
          </div>
        )}

        {loadingPaymentStatus ? (
          <div className="mt-3 space-y-1">
            {Array.from({ length: Math.min(membersCount || 5, 10) }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5">
                <Skeleton className="h-4 w-20" />
                <div className="flex gap-1">
                  <Skeleton className="h-7 w-12 rounded-full" />
                  <Skeleton className="h-7 w-12 rounded-full" />
                  <Skeleton className="h-7 w-12 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : duesStatus.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">팀원이 없습니다.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-1">
            {duesStatus.map((m) => (
              <div key={m.id} className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-3 py-2.5",
                m.status === "UNPAID" ? "bg-[hsl(var(--loss)/0.08)] border border-[hsl(var(--loss)/0.15)]" : "bg-secondary/50"
              )}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={cn("text-xs font-medium whitespace-nowrap", m.status === "UNPAID" ? "text-[hsl(var(--loss))]" : "text-foreground")}>{m.name}</span>
                  {ROLE_LABEL[m.role] && (
                    <span className={cn(
                      "shrink-0 rounded px-1 py-px text-xs font-bold",
                      m.role === "OWNER" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                    )}>
                      {ROLE_LABEL[m.role]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {m.paidAmount > 0 && (
                    <span className="mr-1 text-xs font-medium text-[hsl(var(--success))]">
                      {m.paidAmount.toLocaleString()}원
                    </span>
                  )}
                  {isStaffOrAbove(role) ? (
                    (["PAID", "UNPAID", "EXEMPT"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={async () => {
                          await apiMutate("/api/dues/payment-status", "POST", {
                            memberId: m.id,
                            month: monthFilter,
                            status: s,
                            paidAmount: s === "PAID" ? m.paidAmount : 0,
                          });
                          await refetchPaymentStatus();
                        }}
                        className={cn(
                          "rounded-full px-2 py-2 min-h-[36px] text-xs font-bold transition-all active:scale-95",
                          m.status === s
                            ? s === "PAID"
                              ? "bg-[hsl(var(--success))] text-white"
                              : s === "EXEMPT"
                              ? "bg-[hsl(var(--warning))] text-background"
                              : "bg-[hsl(var(--loss))] text-white"
                            : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        {s === "PAID" ? "납부" : s === "EXEMPT" ? "면제" : "미납"}
                      </button>
                    ))
                  ) : (
                    <span className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-bold",
                      m.status === "PAID" ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                        : m.status === "EXEMPT" ? "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]"
                        : "bg-[hsl(var(--loss))]/15 text-[hsl(var(--loss))]"
                    )}>
                      {m.status === "PAID" ? "납부" : m.status === "EXEMPT" ? "면제" : "미납"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export const DuesStatusTab = React.memo(DuesStatusTabInner);
