"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useApi, apiMutate } from "@/lib/useApi";
import { useConfirm } from "@/lib/ConfirmContext";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { useToast } from "@/lib/ToastContext";
import type { Role } from "@/lib/types";

import { ChevronLeft, ChevronRight, X, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/formatters";

import { DuesRecordsTab } from "./DuesRecordsTab";
import { DuesStatusTab } from "./DuesStatusTab";
import { DuesBulkTab } from "./DuesBulkTab";
import { DuesSettingsTab } from "./DuesSettingsTab";
import { DuesPenaltyTab } from "./DuesPenaltyTab";

/* ── API / 초기 데이터 타입은 initialData.types.ts 공유 파일에서 import ── */

import type {
  ApiDuesRecord,
  ApiDuesSetting,
  ApiPenaltyRule,
  ApiPenaltyRecord,
  ApiMemberRow,
  DuesInitialData,
} from "./initialData.types";

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

const validDuesTabs = ["records", "status", "penalty", "bulk", "settings"] as const;
type DuesTabKey = (typeof validDuesTabs)[number];

/** 역할 우선순위 (높을수록 상단) */
const ROLE_PRIORITY: Record<string, number> = { OWNER: 0, MANAGER: 1, STAFF: 2, MEMBER: 3 };
const STATUS_PRIORITY: Record<string, number> = { UNPAID: 0, PAID: 1, EXEMPT: 2 };

export default function DuesClient({ userId: _userId, userRole, initialData, enableAi = false }: { userId?: string; userRole?: Role; initialData?: DuesInitialData; enableAi?: boolean }) {
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
  const { data: paymentStatusRaw, loading: loadingPaymentStatus, refetch: refetchPaymentStatus } = useApi<Array<{ member_id: string; status: string; paid_amount: number; note?: string }>>(
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

  const confirm = useConfirm();
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

  /** 달력 기준 월별 레코드 (입출금 탭용: 4/1~4/30) */
  const calendarMonthRecords = useMemo(() => {
    if (!monthFilter) return records;
    const [y, m] = monthFilter.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const from = `${monthFilter}-01`;
    const to = `${monthFilter}-${String(lastDay).padStart(2, "0")}`;
    return records.filter((r) => {
      const d = new Date(r.recordedAt);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return date >= from && date <= to;
    });
  }, [records, monthFilter]);

  /** 기준일 기반 레코드 (납부현황 탭용: 3/25~4/24) */
  const monthRecords = useMemo(() => {
    if (!monthFilter) return records;
    const { from, to } = getDuesPeriod(monthFilter, periodConfig.startDay);
    return records.filter((r) => {
      const d = new Date(r.recordedAt);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
        const existing = matches.find((m) => m.memberId === matched.memberId);
        if (existing) existing.amount += r.amount;
        else matches.push({ memberId: matched.memberId, amount: r.amount, status: "PAID" });
      }
    }

    // 매칭된 멤버 ID 셋
    const matchedMemberIds = new Set(matches.map((m) => m.memberId));

    // 기존 PAID인데 이번 매칭에 없는 사람 → UNPAID로 변경
    for (const ps of paymentStatusRaw ?? []) {
      if (ps.status === "PAID" && !matchedMemberIds.has(ps.member_id)) {
        matches.push({ memberId: ps.member_id, amount: 0, status: "UNPAID" });
      }
    }

    if (matches.length > 0) {
      await apiMutate("/api/dues/payment-status", "PUT", { month: monthFilter, matches });
      await refetchPaymentStatus();
      const paidCount = matches.filter((m) => m.status === "PAID").length;
      const unpaidCount = matches.filter((m) => m.status === "UNPAID").length;
      const msg = [];
      if (paidCount > 0) msg.push(`납부 ${paidCount}명`);
      if (unpaidCount > 0) msg.push(`미납 전환 ${unpaidCount}명`);
      showToast(msg.join(" · "), "success");
    } else {
      showToast("매칭된 회비 입금 내역이 없습니다", "info");
    }
  }, [settings.length, monthRecords, isDuesPayment, members, monthFilter, refetchPaymentStatus, showToast, paymentStatusRaw]);

  /** 월별 회비 납부 현황 계산 */
  const duesStatus = useMemo(() => {
    if (!members.length) return [];

    const list = members.map((m) => {
      const dbStatus = paymentStatusMap.get(m.memberId);

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

  /* 최초 로딩 시에만 스켈레톤 표시 (refetch 중에는 탭 콘텐츠 유지하여 state 보존) */
  const [initialLoaded, setInitialLoaded] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!loading && !initialLoaded) setInitialLoaded(true); }, [loading]);

  if (!initialLoaded && loading) {
    return (
      <div className="space-y-4">
        <Card className="relative overflow-hidden border-white/[0.06] bg-card py-4">
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, hsl(16 85% 58% / 0.12) 0%, transparent 60%)" }} />
          <CardContent className="relative space-y-3 px-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="space-y-2 border-t border-white/[0.08] pt-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardContent>
        </Card>
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Section 1: 잔고 카드 (코랄 gradient) ── */}
      <Card className="relative overflow-hidden border-white/[0.06] bg-card py-4">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, hsl(16 85% 58% / 0.12) 0%, transparent 60%)" }} />
        <CardContent className="relative space-y-3 px-4">
          <div className="space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">통장 잔고</p>
            {summaryData.balance !== null ? (
              <p className="text-[clamp(1.75rem,7vw,2.5rem)] font-bold leading-none tracking-wide text-primary tabular-nums">
                {formatAmount(summaryData.balance)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/80">
                업로드 탭에서 스크린샷이나 엑셀을 올리면 잔고가 반영됩니다
              </p>
            )}
            {summaryData.balanceUpdatedAt && (
              <p className="text-xs text-muted-foreground/80">
                최종 업데이트: {new Date(summaryData.balanceUpdatedAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                <span className="ml-1 text-muted-foreground/50">· 스크린샷/엑셀 기준</span>
              </p>
            )}
          </div>
          <MonthlySettlement records={records} />
        </CardContent>
      </Card>

      {/* ── 평회원: 내 납부 상태 ── */}
      {!isStaffOrAbove(role) && _userId && (() => {
        const myStatus = duesStatus.find((m) => m.id === _userId);
        const [yy, mm] = monthFilter.split("-").map(Number);
        const displayMonth = yy !== new Date().getFullYear() ? `${yy}. ${mm}` : String(mm);
        return myStatus ? (
          <Card className="border-white/[0.06] bg-card py-4">
            <CardContent className="px-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">내 납부 상태</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => { const [y, m] = monthFilter.split("-").map(Number); const prev = new Date(y, m - 2); setMonthFilter(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`); }}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors active:scale-[0.97]"
                    aria-label="이전 달"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="min-w-[2.5rem] text-center text-sm font-medium text-foreground">{displayMonth}</span>
                  <button
                    type="button"
                    onClick={() => { const [y, m] = monthFilter.split("-").map(Number); const next = new Date(y, m); setMonthFilter(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`); }}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors active:scale-[0.97]"
                    aria-label="다음 달"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="mt-4">
                {myStatus.status === "PAID" && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--success))]/20">
                        <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                      </div>
                      <span className="text-lg font-semibold text-[hsl(var(--success))]">납부 완료</span>
                    </div>
                    {myStatus.paidAmount > 0 && <span className="text-sm font-medium text-foreground">{formatAmount(myStatus.paidAmount)}</span>}
                  </div>
                )}
                {myStatus.status === "UNPAID" && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/20">
                        <X className="h-4 w-4 text-destructive" />
                      </div>
                      <span className="text-lg font-semibold text-destructive">미납</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {settings.length > 0 && <span className="text-sm font-medium text-foreground">{formatAmount(settings[0].monthlyAmount)}</span>}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10 active:scale-[0.97] transition-transform"
                        disabled={selfReporting}
                        onClick={async () => {
                          const ok = await confirm({ title: "입금 사실을 운영진에게 알리시겠습니까?", variant: "default", confirmLabel: "신고하기" });
                          if (!ok) return;
                          setSelfReporting(true);
                          const { error } = await apiMutate("/api/dues/payment-status", "POST", { memberId: _userId, month: monthFilter, status: "PAID", paidAmount: settings.length > 0 ? settings[0].monthlyAmount : 0, note: "회원 자기 신고 (확인 필요)", selfReport: true });
                          setSelfReporting(false);
                          if (!error) { await refetchPaymentStatus(); showToast("납부 신고 완료. 운영진이 확인 후 처리합니다.", "success"); } else { showToast(error, "error"); }
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                        {selfReporting ? "전송 중..." : "입금했어요"}
                      </Button>
                    </div>
                  </div>
                )}
                {myStatus.status === "EXEMPT" && (
                  <div>
                    <span className="text-lg font-semibold italic text-[hsl(var(--warning))]">면제</span>
                    {myStatus.note && <p className="text-xs text-muted-foreground mt-0.5">({myStatus.note})</p>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* ── Dues Tab Bar ── */}
      <nav className="sticky top-0 z-10 -mx-4 backdrop-blur-md bg-background/80">
        <div className="border-b border-border px-4">
        <div className="flex" role="tablist">
          {([
            { key: "records" as const, label: "입출금", staffOnly: false, show: true },
            { key: "status" as const, label: "납부현황", staffOnly: true, show: true },
            { key: "penalty" as const, label: "벌금", staffOnly: false, show: (summaryData.penaltyRules?.length ?? 0) > 0 },
            { key: "bulk" as const, label: "업로드", staffOnly: true, show: true },
            { key: "settings" as const, label: "설정", staffOnly: true, show: true },
          ]).filter((tab) => tab.show && (!tab.staffOnly || isStaffOrAbove(role))).map((tab) => (
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
      </nav>

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
                <p className="font-medium text-sm text-foreground">업로드</p>
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
          monthRecords={calendarMonthRecords}
          members={members}
          refetchSummary={refetchSummary}
          syncPaymentStatus={syncPaymentStatus}
          showToast={showToast}
          autoMatchMember={autoMatchMember}
          duesAmounts={duesAmounts}
          refetchPaymentStatus={refetchPaymentStatus}
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

      <div className={duesTab === "penalty" ? "" : "hidden"}>
        <DuesPenaltyTab role={role} />
      </div>

      <div className={duesTab === "bulk" ? "" : "hidden"}>
        <DuesBulkTab
          records={records}
          members={members}
          summaryRecords={summaryData.records}
          refetchSummary={refetchSummary}
          syncPaymentStatus={syncPaymentStatus}
          showToast={showToast}
          autoMatchMember={autoMatchMember}
          enableAi={enableAi}
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
          members={members}
          refetchPaymentStatus={refetchPaymentStatus}
        />
      </div>

    </div>
  );
}

// ── 월별 수지결산 (잔고 카드 하단) ──
type SettlementRecord = { type: string; amount: number; recordedAt: string };

function MonthlySettlement({ records }: { records: SettlementRecord[] }) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const monthRecords = records.filter((r) => r.recordedAt.startsWith(currentMonth));
  const income = monthRecords.filter((r) => r.type === "INCOME").reduce((s, r) => s + r.amount, 0);
  const expense = monthRecords.filter((r) => r.type === "EXPENSE").reduce((s, r) => s + r.amount, 0);

  if (income === 0 && expense === 0) return null;

  const net = income - expense;

  return (
    <div className="space-y-2 border-t border-white/[0.08] pt-3">
      <p className="text-[11px] font-medium text-muted-foreground">월별 수지결산</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/80">{now.getMonth() + 1}월 수입</span>
          <span className="font-medium text-[hsl(var(--success))]">+{formatAmount(income)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/80">{now.getMonth() + 1}월 지출</span>
          <span className="font-medium text-[hsl(var(--loss))]">-{formatAmount(expense)}</span>
        </div>
        <div className="flex items-center justify-between text-sm pt-1 border-t border-white/[0.05]">
          <span className="font-medium text-foreground">순이익</span>
          <span className={cn("font-semibold", net >= 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--loss))]")}>
            {net >= 0 ? "+" : ""}{formatAmount(net)}
          </span>
        </div>
      </div>
    </div>
  );
}
