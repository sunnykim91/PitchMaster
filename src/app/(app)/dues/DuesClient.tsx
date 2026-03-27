"use client";

import { useMemo, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useApi, apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { useToast } from "@/lib/ToastContext";
import type { Role } from "@/lib/types";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { DuesRecordsTab } from "./DuesRecordsTab";
import { DuesStatusTab } from "./DuesStatusTab";
import { DuesBulkTab } from "./DuesBulkTab";
import { DuesSettingsTab } from "./DuesSettingsTab";

/* ── API response types (snake_case from server) ── */

type ApiDuesRecord = {
  id: string;
  team_id: string;
  user_id: string | null;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  screenshot_url: string | null;
  recorded_by: string;
  recorded_at: string;
  users: { name: string } | null;
  recorder: { name: string } | null;
};

type ApiDuesSetting = {
  id: string;
  team_id: string;
  member_type: string;
  monthly_amount: number;
  description: string | null;
  created_at: string;
};

type ApiPenaltyRule = {
  id: string;
  team_id: string;
  name: string;
  amount: number;
  description: string | null;
};

type ApiPenaltyRecord = {
  id: string;
  team_id: string;
  rule_id: string;
  member_id: string;
  amount: number;
  date: string;
  is_paid: boolean;
  note: string | null;
  rule: { name: string };
  member: { name: string };
};

type ApiMemberRow = {
  id: string;
  user_id: string | null;
  role: string;
  pre_name: string | null;
  users: { id: string; name: string } | null;
};

type ApiMember = {
  id: string;
  name: string;
  memberId: string;
  role: string;
};

/* ── Client-side types (camelCase) ── */

type DuesRecord = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  recordedAt: string;
  memberName?: string;
  method?: string;
};

type DuesSetting = {
  id: string;
  memberType: string;
  monthlyAmount: number;
  description: string;
};

type DuesInitialData = {
  records: ApiDuesRecord[];
  balance: number | null;
  balanceUpdatedAt: string | null;
  settings: ApiDuesSetting[];
  penaltyRules: ApiPenaltyRule[];
  penaltyRecords: ApiPenaltyRecord[];
  members?: ApiMemberRow[];
};

const validDuesTabs = ["records", "status", "bulk", "settings"] as const;
type DuesTabKey = (typeof validDuesTabs)[number];

/** 역할 우선순위 (높을수록 상단) */
const ROLE_PRIORITY: Record<string, number> = { OWNER: 0, MANAGER: 1, STAFF: 2, MEMBER: 3 };
const STATUS_PRIORITY: Record<string, number> = { UNPAID: 0, PAID: 1, EXEMPT: 2 };

export default function DuesClient({ userId: _userId, userRole, initialData }: { userId?: string; userRole?: Role; initialData?: DuesInitialData }) {
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);
  const { showToast } = useToast();

  /* ── API data fetching ── */
  type DuesSummary = {
    records: ApiDuesRecord[];
    balance: number | null;
    balanceUpdatedAt: string | null;
    settings: ApiDuesSetting[];
    penaltyRules: ApiPenaltyRule[];
    penaltyRecords: ApiPenaltyRecord[];
  };
  const {
    data: summaryData,
    loading: loadingSummary,
    refetch: refetchSummary,
  } = useApi<DuesSummary>(
    "/api/dues/summary",
    initialData
      ? {
          records: initialData.records,
          balance: initialData.balance,
          balanceUpdatedAt: initialData.balanceUpdatedAt,
          settings: initialData.settings,
          penaltyRules: initialData.penaltyRules,
          penaltyRecords: initialData.penaltyRecords,
        }
      : { records: [], balance: null, balanceUpdatedAt: null, settings: [], penaltyRules: [], penaltyRecords: [] },
    { skip: !!initialData }
  );

  const {
    data: membersRaw,
    loading: loadingMembers,
  } = useApi<{ members: ApiMemberRow[] }>(
    "/api/members",
    initialData?.members ? { members: initialData.members } : { members: [] },
    { skip: !!initialData }
  );

  /* ── Map API snake_case → camelCase ── */
  const records: DuesRecord[] = useMemo(
    () =>
      summaryData.records.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        description: r.description,
        recordedAt: r.recorded_at,
        memberName: r.users?.name ?? undefined,
        method: undefined,
      })),
    [summaryData.records]
  );

  const settings: DuesSetting[] = useMemo(
    () =>
      summaryData.settings
        .filter((s) => s.member_type !== "__PERIOD__")
        .map((s) => ({
          id: s.id,
          memberType: s.member_type,
          monthlyAmount: s.monthly_amount,
          description: s.description ?? "",
        })),
    [summaryData.settings]
  );

  /** 납부 기준일 (매월 N일부터 다음달 N-1일까지를 한 달로 봄, 기본값 1 = 달력 기준) */
  const periodConfig = useMemo(() => {
    const row = summaryData.settings.find((s) => s.member_type === "__PERIOD__");
    return { id: row?.id, startDay: row?.monthly_amount ?? 1 };
  }, [summaryData.settings]);

  const members: ApiMember[] = useMemo(
    () =>
      membersRaw.members
        .filter((m: ApiMemberRow) => m.users?.name || m.pre_name)
        .map((m: ApiMemberRow) => ({
          id: m.users?.id ?? `unlinked_${m.id}`,
          name: m.users?.name ?? m.pre_name ?? "",
          memberId: m.id,
          role: m.role ?? "MEMBER",
        })),
    [membersRaw.members],
  );

  /* ── Local UI state ── */
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const duesTabFromUrl = searchParams.get("tab") as DuesTabKey | null;
  const [duesTab, setDuesTabState] = useState<DuesTabKey>(
    duesTabFromUrl && validDuesTabs.includes(duesTabFromUrl) ? duesTabFromUrl : "records"
  );
  const setDuesTab = useCallback((tab: DuesTabKey) => {
    setDuesTabState(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // 납부 상태 API
  const { data: paymentStatusRaw, loading: loadingPaymentStatus, refetch: refetchPaymentStatus } = useApi<any[]>(
    `/api/dues/payment-status?month=${monthFilter}`,
    [],
  );
  const paymentStatusMap = useMemo(() => {
    const map = new Map<string, { status: string; paidAmount: number; note?: string }>();
    for (const ps of paymentStatusRaw ?? []) {
      map.set(ps.member_id, { status: ps.status, paidAmount: ps.paid_amount, note: ps.note });
    }
    return map;
  }, [paymentStatusRaw]);

  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void; variant?: "default" | "destructive"; confirmLabel?: string } | null>(null);
  const [selfReporting, setSelfReporting] = useState(false);

  /* ── 온보딩 가이드 상태 ── */
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("dues-onboarding-dismissed") === "true";
  });

  const dismissOnboarding = useCallback(() => {
    localStorage.setItem("dues-onboarding-dismissed", "true");
    setOnboardingDismissed(true);
  }, []);

  /** 온보딩 표시 조건: 운영진 이상 + 회비 설정 없거나 금액 0 + 닫기 누른 적 없음 */
  const showOnboarding =
    isStaffOrAbove(role) &&
    !onboardingDismissed &&
    (settings.length === 0 || settings.every((s) => s.monthlyAmount === 0));

  const loading = loadingSummary || loadingMembers;

  /** description에서 팀원 이름 자동 매칭 → user_id 반환 */
  const autoMatchMember = useCallback((description: string): string | undefined => {
    if (!description) return undefined;
    const matched = members.find((m) => description.includes(m.name));
    return matched?.id;
  }, [members]);

  /** 납부 기준일 기반 기간 계산 */
  const getDuesPeriod = useCallback((month: string, startDay: number): { from: string; to: string } => {
    const [y, m] = month.split("-").map(Number);
    if (startDay <= 1) {
      const lastDay = new Date(y, m, 0).getDate();
      return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
    }
    const prevMonth = new Date(y, m - 2);
    const prevY = prevMonth.getFullYear();
    const prevM = String(prevMonth.getMonth() + 1).padStart(2, "0");
    const endDay = startDay - 1;
    return {
      from: `${prevY}-${prevM}-${String(startDay).padStart(2, "0")}`,
      to: `${month}-${String(endDay).padStart(2, "0")}`,
    };
  }, []);

  /** 월별 필터 적용된 레코드 (기준일 기반) */
  const monthRecords = useMemo(() => {
    if (!monthFilter) return records;
    const { from, to } = getDuesPeriod(monthFilter, periodConfig.startDay);
    return records.filter((r) => {
      const date = r.recordedAt.slice(0, 10);
      return date >= from && date <= to;
    });
  }, [records, monthFilter, periodConfig.startDay, getDuesPeriod]);

  /** 설정된 회비 금액 목록 */
  const duesAmounts = useMemo(() => settings.map((s) => s.monthlyAmount), [settings]);

  /** 입금액이 회비 금액 중 하나와 일치하는지 확인 */
  const isDuesPayment = useCallback((amount: number): boolean => {
    return duesAmounts.includes(amount);
  }, [duesAmounts]);

  /** 입금 내역에서 자동 매칭된 멤버들의 납부 상태를 일괄 업데이트 */
  const syncPaymentStatus = useCallback(async () => {
    if (settings.length === 0) {
      showToast("회비 기준을 먼저 설정해주세요. (설정 탭)", "error");
      return;
    }

    const matches: { memberId: string; amount: number; status: "PAID" | "UNPAID" }[] = [];
    for (const r of monthRecords) {
      if (r.type !== "INCOME") continue;
      if (!isDuesPayment(r.amount)) continue;
      const matched = members.find((m) => r.memberName === m.name || r.description?.includes(m.name));
      if (matched) {
        const existing = matches.find((m) => m.memberId === matched.id);
        if (existing) existing.amount += r.amount;
        else matches.push({ memberId: matched.id, amount: r.amount, status: "PAID" });
      }
    }

    if (matches.length > 0) {
      await apiMutate("/api/dues/payment-status", "PUT", { month: monthFilter, matches });
      await refetchPaymentStatus();
      showToast(`${matches.length}명 납부 확인`, "success");
    } else {
      showToast("매칭된 회비 입금 내역이 없습니다", "info");
    }
  }, [settings.length, monthRecords, isDuesPayment, members, monthFilter, refetchPaymentStatus, showToast]);

  /** 월별 회비 납부 현황 계산 */
  const duesStatus = useMemo(() => {
    if (!members.length) return [];

    const list = members.map((m) => {
      const dbStatus = paymentStatusMap.get(m.id);

      if (dbStatus) {
        return {
          id: m.id,
          memberId: m.memberId,
          name: m.name,
          role: m.role,
          paidAmount: dbStatus.paidAmount,
          status: dbStatus.status as "PAID" | "UNPAID" | "EXEMPT",
          note: dbStatus.note,
        };
      }

      const paid = monthRecords.filter(
        (r) => r.type === "INCOME" && (r.memberName === m.name || r.description?.includes(m.name))
      );
      const duesPaid = paid.filter((r) => isDuesPayment(r.amount));
      const paidAmount = duesPaid.reduce((sum, r) => sum + r.amount, 0);
      return {
        id: m.id,
        memberId: m.memberId,
        name: m.name,
        role: m.role,
        paidAmount,
        status: (paidAmount > 0 ? "PAID" : "UNPAID") as "PAID" | "UNPAID" | "EXEMPT",
        note: undefined as string | undefined,
      };
    });

    list.sort((a, b) => {
      const roleDiff = (ROLE_PRIORITY[a.role] ?? 3) - (ROLE_PRIORITY[b.role] ?? 3);
      if (roleDiff !== 0) return roleDiff;
      return (STATUS_PRIORITY[a.status] ?? 1) - (STATUS_PRIORITY[b.status] ?? 1);
    });

    return list;
  }, [members, monthRecords, isDuesPayment, paymentStatusMap]);

  if (loading) {
    return (
      <div className="grid gap-5 stagger-children">
        <Card className="p-4 sm:p-6"><div className="space-y-4">
          <div className="flex items-center justify-between"><Skeleton className="h-5 w-32"/><Skeleton className="h-8 w-24"/></div>
          <Skeleton className="h-10 w-48"/>
          <Skeleton className="h-3 w-40"/>
        </div></Card>
        <Card className="p-4 sm:p-6"><div className="space-y-3">
          <Skeleton className="h-5 w-24"/>
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full"/>)}
        </div></Card>
      </div>
    );
  }

  return (
    <div className="grid gap-5 stagger-children">
      {/* ── Section 1: 회비 현황 (always visible) ── */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-heading text-lg sm:text-2xl font-bold uppercase text-foreground">
            회비 현황
          </h2>
        </div>

        <div className="card-featured mt-5">
          <div>
            <p className="type-overline">통장 잔고</p>
            {summaryData.balance !== null ? (
              <p className="mt-1 type-score text-[hsl(var(--primary))]">
                {summaryData.balance.toLocaleString()}원
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                내역 올리기 탭에서 스크린샷이나 엑셀을 올리면 잔고가 반영됩니다
              </p>
            )}
            {summaryData.balanceUpdatedAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                최종 업데이트: {new Date(summaryData.balanceUpdatedAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* ── 평회원: 내 납부 상태 ── */}
      {!isStaffOrAbove(role) && _userId && (() => {
        const myStatus = duesStatus.find((m) => m.id === _userId);
        return myStatus ? (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="type-overline">{monthFilter.replace("-", "년 ")}월 내 납부 상태</p>
                <p className={cn(
                  "mt-1 text-lg font-bold",
                  myStatus.status === "PAID" ? "text-[hsl(var(--success))]"
                    : myStatus.status === "EXEMPT" ? "text-[hsl(var(--warning))]"
                    : "text-[hsl(var(--loss))]"
                )}>
                  {myStatus.status === "PAID" ? "납부 완료" : myStatus.status === "EXEMPT" ? "면제" : "미납"}
                </p>
                {myStatus.paidAmount > 0 && (
                  <p className="text-xs text-muted-foreground">{myStatus.paidAmount.toLocaleString()}원</p>
                )}
                {myStatus.status === "UNPAID" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    disabled={selfReporting}
                    onClick={() => setConfirmAction({
                      message: "입금 사실을 운영진에게 알리시겠습니까?",
                      variant: "default",
                      confirmLabel: "신고하기",
                      onConfirm: async () => {
                        setSelfReporting(true);
                        const { error } = await apiMutate("/api/dues/payment-status", "POST", {
                          memberId: _userId,
                          month: monthFilter,
                          status: "PAID",
                          paidAmount: settings.length > 0 ? settings[0].monthlyAmount : 0,
                          note: "회원 자기 신고 (확인 필요)",
                          selfReport: true,
                        });
                        setSelfReporting(false);
                        if (!error) {
                          await refetchPaymentStatus();
                          showToast("납부 신고 완료. 운영진이 확인 후 처리합니다.", "success");
                        } else {
                          showToast(error, "error");
                        }
                      },
                    })}
                  >
                    {selfReporting ? "신고 중..." : "입금했어요"}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const [y, m] = monthFilter.split("-").map(Number);
                    const prev = new Date(y, m - 2);
                    setMonthFilter(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
                  }}
                  className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="이전 달"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[60px] text-center text-xs font-medium">
                  {monthFilter.replace("-", ".")}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const [y, m] = monthFilter.split("-").map(Number);
                    const next = new Date(y, m);
                    setMonthFilter(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
                  }}
                  className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="다음 달"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        ) : null;
      })()}

      {/* ── Dues Tab Bar ── */}
      <div className="sticky top-0 z-10 -mx-1 px-1 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex" role="tablist">
          {([
            { key: "records" as const, label: "입출금", staffOnly: false },
            { key: "status" as const, label: "납부현황", staffOnly: true },
            { key: "bulk" as const, label: "내역 올리기", staffOnly: true },
            { key: "settings" as const, label: "설정", staffOnly: true },
          ]).filter((tab) => !tab.staffOnly || isStaffOrAbove(role)).map((tab) => (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              role="tab"
              aria-selected={duesTab === tab.key}
              aria-controls={`tabpanel-${tab.key}`}
              onClick={() => { setDuesTab(tab.key as typeof duesTab); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
                duesTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 온보딩 가이드 ── */}
      {showOnboarding && (
        <Card className="p-4 sm:p-6 border-primary/20 bg-primary/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">💰</span>
              <h3 className="font-semibold text-base text-foreground">회비 관리 시작하기</h3>
            </div>
            <button
              type="button"
              onClick={dismissOnboarding}
              className="rounded-md p-1 hover:bg-primary/10 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="온보딩 가이드 닫기"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="mt-4 grid gap-4">
            {/* 단계 1 */}
            <div className="flex gap-3">
              <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                1
              </span>
              <div className="flex-1">
                <p className="font-medium text-sm text-foreground">금액 설정</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  월 회비 금액과 납부 기준일을 설정 탭에서 설정하세요
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => {
                    setDuesTab("settings");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  설정하러 가기 →
                </Button>
              </div>
            </div>

            {/* 단계 2 */}
            <div className="flex gap-3">
              <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                2
              </span>
              <div>
                <p className="font-medium text-sm text-foreground">내역 올리기</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  통장 스크린샷(OCR) 또는 엑셀로 입출금 내역을 한 번에 올리세요
                </p>
              </div>
            </div>

            {/* 단계 3 */}
            <div className="flex gap-3">
              <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                3
              </span>
              <div>
                <p className="font-medium text-sm text-foreground">납부 확인</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  자동으로 팀원별 납부 현황이 정리됩니다
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Tab Content ── */}
      <div className={duesTab === "records" ? "" : "hidden"}>
        <DuesRecordsTab
          role={role}
          monthFilter={monthFilter}
          setMonthFilter={setMonthFilter}
          monthRecords={monthRecords}
          members={members}
          refetchSummary={refetchSummary}
          syncPaymentStatus={syncPaymentStatus}
          showToast={showToast}
          setConfirmAction={setConfirmAction}
          autoMatchMember={autoMatchMember}
          summaryBalance={summaryData.balance}
        />
      </div>

      <div className={duesTab === "status" ? "" : "hidden"}>
        <DuesStatusTab
          role={role}
          monthFilter={monthFilter}
          setMonthFilter={setMonthFilter}
          duesStatus={duesStatus}
          settings={settings}
          loadingPaymentStatus={loadingPaymentStatus}
          membersCount={members.length}
          periodConfig={periodConfig}
          getDuesPeriod={getDuesPeriod}
          refetchPaymentStatus={refetchPaymentStatus}
          syncPaymentStatus={syncPaymentStatus}
          setDuesTab={setDuesTab}
          showToast={showToast}
        />
      </div>

      <div className={duesTab === "bulk" ? "" : "hidden"}>
        <DuesBulkTab
          records={records}
          members={members}
          summaryRecords={summaryData.records}
          summaryBalance={summaryData.balance}
          refetchSummary={refetchSummary}
          syncPaymentStatus={syncPaymentStatus}
          showToast={showToast}
          autoMatchMember={autoMatchMember}
        />
      </div>

      <div className={duesTab === "settings" ? "" : "hidden"}>
        <DuesSettingsTab
          role={role}
          monthFilter={monthFilter}
          settings={settings}
          periodConfig={periodConfig}
          getDuesPeriod={getDuesPeriod}
          refetchSummary={refetchSummary}
          showToast={showToast}
          setConfirmAction={setConfirmAction}
        />
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.message ?? ""}
        variant={confirmAction?.variant ?? "destructive"}
        confirmLabel={confirmAction?.confirmLabel ?? "삭제"}
        onConfirm={() => { confirmAction?.onConfirm(); setConfirmAction(null); }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
