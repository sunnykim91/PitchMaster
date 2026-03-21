"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import Image from "next/image";
import { useApi, apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { useToast } from "@/lib/ToastContext";
import type { Role } from "@/lib/types";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

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

type PenaltyRule = {
  id: string;
  name: string;
  amount: number;
  description?: string;
};

type PenaltyRecord = {
  id: string;
  ruleId: string;
  ruleName: string;
  memberId: string;
  memberName: string;
  amount: number;
  date: string;
  isPaid: boolean;
  note?: string;
};

type RecordFilter = "ALL" | "INCOME" | "EXPENSE";

type BulkRow = {
  date: string;
  time: string;
  type: "INCOME" | "EXPENSE";
  amount: string;
  description: string;
  memberName: string;
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

  const penaltyRules: PenaltyRule[] = useMemo(
    () =>
      summaryData.penaltyRules.map((r) => ({
        id: r.id,
        name: r.name,
        amount: r.amount,
        description: r.description ?? undefined,
      })),
    [summaryData.penaltyRules]
  );

  const penaltyRecords: PenaltyRecord[] = useMemo(
    () =>
      summaryData.penaltyRecords.map((r) => ({
        id: r.id,
        ruleId: r.rule_id,
        ruleName: r.rule.name,
        memberId: r.member_id,
        memberName: r.member.name,
        amount: r.amount,
        date: r.date,
        isPaid: r.is_paid,
        note: r.note ?? undefined,
      })),
    [summaryData.penaltyRecords]
  );

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
  const validDuesTabs = ["records", "status", "bulk", "settings"] as const;
  type DuesTabKey = (typeof validDuesTabs)[number];
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

  /** 입금 내역에서 자동 매칭된 멤버들의 납부 상태를 일괄 업데이트 */
  async function syncPaymentStatus() {
    // 회비 기준 미설정 시 차단
    if (settings.length === 0) {
      showToast("회비 기준을 먼저 설정해주세요. (설정 탭)", "error");
      return;
    }

    const matches: { memberId: string; amount: number; status: "PAID" | "UNPAID" }[] = [];
    for (const r of monthRecords) {
      if (r.type !== "INCOME") continue;
      // 이름 매칭 + 금액이 회비 설정과 일치하는 입금만 회비로 인정
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
  }

  const [filter, setFilter] = useState<RecordFilter>("ALL");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [isPenaltyRuleOpen, setIsPenaltyRuleOpen] = useState(false);
  const [isPenaltyFormOpen, setIsPenaltyFormOpen] = useState(false);
  const [memberFilter, setMemberFilter] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkImage, setBulkImage] = useState<string | null>(null);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([
    { date: "", time: "", type: "INCOME", amount: "", description: "", memberName: "" },
  ]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<Record<number, string[]>>({});
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelRecords, setExcelRecords] = useState<{ date: string; type: "INCOME" | "EXPENSE"; amount: number; description: string; balance: number | null }[]>([]);
  const [excelBalance, setExcelBalance] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savingSetting, setSavingSetting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");
  const [editingRecord, setEditingRecord] = useState<DuesRecord | null>(null);
  const [editingSetting, setEditingSetting] = useState<DuesSetting | null>(null);
  const [settingFormState, setSettingFormState] = useState({ memberType: "", monthlyAmount: "", description: "" });
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void; variant?: "default" | "destructive"; confirmLabel?: string } | null>(null);
  const [selfReporting, setSelfReporting] = useState(false);
  const bulkSectionRef = useRef<HTMLDivElement>(null);

  const loading = loadingSummary || loadingMembers;

  /** description에서 팀원 이름 자동 매칭 → user_id 반환 */
  function autoMatchMember(description: string): string | undefined {
    if (!description) return undefined;
    const matched = members.find((m) => description.includes(m.name));
    return matched?.id;
  }

  /** 납부 기준일 기반 기간 계산: "2026-03" + startDay=25 → 2026-02-25 ~ 2026-03-24 */
  function getDuesPeriod(month: string, startDay: number): { from: string; to: string } {
    const [y, m] = month.split("-").map(Number);
    if (startDay <= 1) {
      // 기본값: 달력 월 (1일~말일)
      const lastDay = new Date(y, m, 0).getDate();
      return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
    }
    // 전월 startDay ~ 당월 startDay-1
    const prevMonth = new Date(y, m - 2); // m-1에서 1 더 빼면 전월
    const prevY = prevMonth.getFullYear();
    const prevM = String(prevMonth.getMonth() + 1).padStart(2, "0");
    const endDay = startDay - 1;
    return {
      from: `${prevY}-${prevM}-${String(startDay).padStart(2, "0")}`,
      to: `${month}-${String(endDay).padStart(2, "0")}`,
    };
  }

  /** 월별 필터 적용된 레코드 (기준일 기반) */
  const monthRecords = useMemo(() => {
    if (!monthFilter) return records;
    const { from, to } = getDuesPeriod(monthFilter, periodConfig.startDay);
    return records.filter((r) => {
      const date = r.recordedAt.split("T")[0];
      return date >= from && date <= to;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, monthFilter, periodConfig.startDay]);

  /** 설정된 회비 금액 목록 (ex: [20000, 15000, 10000]) */
  const duesAmounts = useMemo(() => settings.map((s) => s.monthlyAmount), [settings]);

  /** 입금액이 회비 금액 중 하나와 일치하는지 확인 */
  function isDuesPayment(amount: number): boolean {
    return duesAmounts.includes(amount);
  }

  /** 역할 우선순위 (높을수록 상단) */
  const ROLE_PRIORITY: Record<string, number> = { OWNER: 0, MANAGER: 1, STAFF: 2, MEMBER: 3 };
  const ROLE_LABEL: Record<string, string> = { OWNER: "회장", MANAGER: "운영진", STAFF: "스태프" };
  const STATUS_PRIORITY: Record<string, number> = { UNPAID: 0, PAID: 1, EXEMPT: 2 };

  /** 월별 회비 납부 현황 계산 (DB 납부 상태 우선, 없으면 자동 매칭) */
  const duesStatus = useMemo(() => {
    if (!members.length) return [];

    const list = members.map((m) => {
      const dbStatus = paymentStatusMap.get(m.id);

      // DB에 상태가 있으면 그걸 사용
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

      // DB에 없으면 입금 내역에서 자동 판단: 이름 매칭 + 금액이 회비 설정과 일치
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

    // 정렬: 역할 우선 (회장>운영진>스태프>회원) → 상태 (미납>납부>면제)
    list.sort((a, b) => {
      const roleDiff = (ROLE_PRIORITY[a.role] ?? 3) - (ROLE_PRIORITY[b.role] ?? 3);
      if (roleDiff !== 0) return roleDiff;
      return (STATUS_PRIORITY[a.status] ?? 1) - (STATUS_PRIORITY[b.status] ?? 1);
    });

    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, monthRecords, duesAmounts, paymentStatusMap]);

  const filteredRecords = useMemo(() => {
    let list = filter === "ALL" ? monthRecords : monthRecords.filter((item) => item.type === filter);
    if (memberFilter.trim()) {
      const q = memberFilter.trim();
      list = list.filter((item) =>
        item.memberName?.includes(q) || item.description?.includes(q)
      );
    }
    return [...list].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  }, [filter, monthRecords, memberFilter]);

  async function handleAddRecord(formData: FormData) {
    const type = String(formData.get("type"));
    const amount = Number(formData.get("amount"));
    const description = String(formData.get("description"));
    const recordedAt = String(formData.get("recordedAt") || "");
    const userId = autoMatchMember(description);
    const screenshotUrlValue = screenshotUrl || undefined;

    const errors: Record<string, string> = {};
    if (!amount || amount <= 0) errors.amount = "금액을 입력해주세요.";
    if (!recordedAt) errors.recordedAt = "날짜를 선택해주세요.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSaving(true);

    try {
      const { error } = await apiMutate("/api/dues", "POST", {
        type,
        amount,
        description,
        userId,
        screenshotUrl: screenshotUrlValue,
        recordedAt: recordedAt || undefined,
      });
      if (!error) {
        await refetchSummary();
        await syncPaymentStatus();
        setIsFormOpen(false);
        setScreenshotUrl("");
        setFormErrors({});
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSetting(formData: FormData) {
    const memberType = String(formData.get("memberType"));
    const monthlyAmount = Number(formData.get("monthlyAmount"));
    const description = String(formData.get("description") || "");

    setSavingSetting(true);
    try {
      const { error } = await apiMutate("/api/dues-settings", "POST", {
        memberType,
        monthlyAmount,
        description,
      });
      if (!error) {
        await refetchSummary();
        setIsSettingOpen(false);
      }
    } finally {
      setSavingSetting(false);
    }
  }

  function handleEditSetting(setting: DuesSetting) {
    setEditingSetting(setting);
    setSettingFormState({
      memberType: setting.memberType,
      monthlyAmount: String(setting.monthlyAmount),
      description: setting.description ?? "",
    });
  }

  function handleCancelEditSetting() {
    setEditingSetting(null);
    setSettingFormState({ memberType: "", monthlyAmount: "", description: "" });
  }

  async function handleUpdateSetting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSetting) return;
    const { error } = await apiMutate("/api/dues-settings", "PUT", {
      id: editingSetting.id,
      memberType: settingFormState.memberType,
      monthlyAmount: Number(settingFormState.monthlyAmount),
      description: settingFormState.description,
    });
    if (error) {
      showToast(error, "error");
      return;
    }
    showToast("회비 기준이 수정되었습니다.");
    await refetchSummary();
    setEditingSetting(null);
    setSettingFormState({ memberType: "", monthlyAmount: "", description: "" });
  }

  async function handleDeleteSetting(id: string) {
    const { error } = await apiMutate("/api/dues-settings", "DELETE", { id });
    if (error) {
      showToast(error, "error");
      return;
    }
    showToast("회비 기준이 삭제되었습니다.");
    await refetchSummary();
  }

  /* ── 일괄 등록 핸들러 ── */

  async function handleBulkImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setBulkImage(imageUrl);

    // Clova OCR API 호출
    setOcrLoading(true);
    setOcrStatus("스크린샷 분석 중...");
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        setOcrStatus(`OCR 서버 오류 (${res.status}): ${json.error || "알 수 없는 오류"}. 수동으로 입력해주세요.`);
        return;
      }

      if (!json.text) {
        setOcrStatus("OCR 응답에 텍스트가 없습니다. 수동으로 입력해주세요.");
        return;
      }

      const { rows: parsed, latestBalance } = parseTransactions(json.text);
      if (latestBalance !== null) {
        await apiMutate("/api/dues/balance", "POST", { balance: latestBalance });
        await refetchSummary();
      }

      // 기존 DB 레코드와 비교하여 중복 제거
      const newRows = parsed.filter((row) => {
        return !records.some(
          (r) =>
            r.recordedAt.startsWith(row.date) &&
            r.amount === Number(row.amount) &&
            r.description === row.description &&
            r.type === row.type
        );
      });
      const duplicateCount = parsed.length - newRows.length;

      if (newRows.length > 0) {
        setBulkRows(newRows);
        const msg = [`${newRows.length}건의 새 거래를 인식했습니다.`];
        if (duplicateCount > 0) msg.push(`(${duplicateCount}건 중복 제외)`);
        if (latestBalance !== null) msg.push(`잔고: ${latestBalance.toLocaleString()}원`);
        msg.push("확인 후 저장하세요.");
        setOcrStatus(msg.join(" "));
      } else if (parsed.length > 0) {
        setOcrStatus(`${parsed.length}건 모두 이미 등록된 내역입니다.`);
      } else {
        setOcrStatus("거래 내역을 인식하지 못했습니다. 수동으로 입력해주세요.");
      }
    } catch {
      setOcrStatus("OCR 처리 중 오류가 발생했습니다. 수동으로 입력해주세요.");
    } finally {
      setOcrLoading(false);
    }
  }

  /**
   * 은행 앱 스크린샷 OCR 텍스트에서 거래 내역 파싱
   *
   * Clova OCR 출력 패턴:
   *   03.12
   *   양문주 -79,230원
   *   10:05 1,238,592원       ← 시간 + 잔액 줄
   *   03.11
   *   젤로스FC 73,000원
   *   11:23 1,317,822원
   *
   * 전략:
   * 1. "이름 금액원" 패턴의 줄 = 거래줄
   * 2. "시간 잔액원" 패턴의 줄 = 잔액줄 (시간만 추출)
   * 3. "MM.DD" 패턴의 줄 = 날짜줄
   */
  type ParseResult = { rows: BulkRow[]; latestBalance: number | null };

  function parseTransactions(ocrText: string): ParseResult {
    const rows: BulkRow[] = [];
    const lines = ocrText.split("\n").map((l) => l.trim()).filter(Boolean);
    const year = new Date().getFullYear();

    let currentDate = "";
    let latestBalance: number | null = null;
    let isFirstBalance = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 날짜 줄: "03.12", "03.07" 등
      const dateMatch = line.match(/^(\d{2})\.(\d{2})$/);
      if (dateMatch) {
        currentDate = `${year}-${dateMatch[1]}-${dateMatch[2]}`;
        continue;
      }

      // 거래 줄: "양문주 -79,230원", "젤로스FC 73,000원"
      const txMatch = line.match(/^(.+?)\s+([+-]?[\d,]+)원$/);
      if (!txMatch) continue;

      const name = txMatch[1].trim();
      const amountStr = txMatch[2];

      // 잔액줄: "10:05 1,238,592원" 또는 "15:54 굿데이fc 1,202,592원"
      // 이름이 시간(HH:MM)으로 시작하면 잔액줄
      if (name.match(/^\d{1,2}:\d{2}/)) {
        const balanceAmount = parseInt(amountStr.replace(/[^0-9]/g, ""), 10);
        if (isFirstBalance && balanceAmount > 0) {
          latestBalance = balanceAmount;
          isFirstBalance = false;
        }
        continue;
      }

      // 이름에 한글이나 영문이 없으면 스킵
      if (!name.match(/[\p{L}]/u)) continue;

      const isExpense = amountStr.startsWith("-");
      const rawAmount = amountStr.replace(/[^0-9]/g, "");
      const num = parseInt(rawAmount, 10);
      if (!num) continue;

      // 잔액 판별: 50만원 이상이면 스킵
      if (num >= 500000) continue;

      // 다음 줄에서 시간 추출
      let time = "";
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const timeMatch = nextLine.match(/^(\d{1,2}:\d{2})/);
        if (timeMatch) {
          time = timeMatch[1];
        }
      }

      const matchedMember = members.find(
        (m) => m.name && (name.includes(m.name) || m.name.includes(name))
      );

      rows.push({
        date: currentDate,
        time,
        type: isExpense ? "EXPENSE" : "INCOME",
        amount: rawAmount,
        description: name,
        memberName: matchedMember?.id || "",
      });
    }

    return { rows, latestBalance };
  }

  function updateBulkRow(index: number, field: keyof BulkRow, value: string) {
    setBulkRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addBulkRow() {
    setBulkRows((prev) => [
      ...prev,
      { date: prev[prev.length - 1]?.date || "", time: "", type: "INCOME", amount: "", description: "", memberName: "" },
    ]);
  }

  function removeBulkRow(index: number) {
    setBulkRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleBulkSave() {
    // 필수값 검증
    const errors: Record<number, string[]> = {};
    bulkRows.forEach((row, i) => {
      const missing: string[] = [];
      if (!row.date) missing.push("date");
      if (!row.amount) missing.push("amount");
      if (!row.description) missing.push("description");
      if (missing.length > 0) errors[i] = missing;
    });
    setBulkErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const validRows = bulkRows.filter((r) => r.amount && r.description && r.date);
    if (validRows.length === 0) return;
    setBulkSaving(true);

    let saved = 0;
    let skipped = 0;
    for (const row of validRows) {
      const { data } = await apiMutate<{ duplicate?: boolean }>("/api/dues", "POST", {
        type: row.type,
        amount: Number(row.amount),
        description: row.description,
        userId: row.memberName || undefined,
        recordedAt: row.date || undefined,
        recordedTime: row.time || undefined,
      });
      if (data?.duplicate) {
        skipped++;
      } else {
        saved++;
      }
    }
    setBulkSaving(false);
    await refetchSummary();
    setIsBulkMode(false);
    setBulkRows([{ date: "", time: "", type: "INCOME", amount: "", description: "", memberName: "" }]);
    setBulkImage(null);
    if (skipped > 0) {
      showToast(`${saved}건 저장, ${skipped}건 중복 스킵`, "info");
    } else {
      showToast(`${saved}건 저장되었습니다.`);
    }
  }

  async function handleDeleteRecord(id: string) {
    // 삭제 전 잔고 차액 계산
    const record = records.find((r) => r.id === id);
    const { error } = await apiMutate(`/api/dues?id=${id}`, "DELETE");
    if (!error) {
      // 잔고 조정: 입금 삭제 → 잔고 감소, 출금 삭제 → 잔고 증가
      if (record && summaryData.balance !== null) {
        const diff = record.type === "INCOME" ? -record.amount : record.amount;
        await apiMutate("/api/dues/balance", "POST", { balance: summaryData.balance + diff });
      }
      await refetchSummary();
    }
  }

  async function handleUpdateRecord(formData: FormData) {
    if (!editingRecord) return;
    const type = String(formData.get("editType")) as "INCOME" | "EXPENSE";
    const amount = Number(formData.get("editAmount"));
    const description = String(formData.get("editDescription"));
    const recordedAt = String(formData.get("editDate") || "");
    const recordedTime = String(formData.get("editTime") || "");
    const userId = autoMatchMember(description);

    // 수정 전 잔고 차액 계산
    const oldValue = editingRecord.type === "INCOME" ? editingRecord.amount : -editingRecord.amount;
    const newValue = type === "INCOME" ? amount : -amount;
    const diff = newValue - oldValue;

    const { error } = await apiMutate("/api/dues", "PUT", {
      id: editingRecord.id,
      type,
      amount,
      description,
      userId,
      recordedAt: recordedAt || undefined,
      recordedTime: recordedTime || undefined,
    });
    if (!error) {
      // 잔고 조정
      if (diff !== 0 && summaryData.balance !== null) {
        await apiMutate("/api/dues/balance", "POST", { balance: summaryData.balance + diff });
      }
      await refetchSummary();
      setEditingRecord(null);
    }
  }

  function handleScreenshotChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setScreenshotUrl(URL.createObjectURL(file));
    }
  }

  /* ── 벌금 관리 ── */
  async function handleAddPenaltyRule(formData: FormData) {
    const name = String(formData.get("penaltyName") || "").trim();
    const amount = Number(formData.get("penaltyAmount") || 0);
    const description = String(formData.get("penaltyDescription") || "") || undefined;
    if (!name || amount <= 0) return;

    const { error } = await apiMutate("/api/penalties", "POST", {
      name,
      amount,
      description,
    });
    if (!error) {
      await refetchSummary();
      setIsPenaltyRuleOpen(false);
    }
  }

  async function handleDeletePenaltyRule(ruleId: string) {
    const { error } = await apiMutate(`/api/penalties?id=${ruleId}&type=rule`, "DELETE");
    if (!error) {
      await refetchSummary();
    }
  }

  async function handleAddPenaltyRecord(formData: FormData) {
    const ruleId = String(formData.get("penaltyRuleId") || "");
    const memberId = String(formData.get("penaltyMemberId") || "");
    const rule = penaltyRules.find((r) => r.id === ruleId);
    const member = members.find((m) => m.id === memberId);
    if (!rule || !member) return;

    const { error } = await apiMutate("/api/penalties", "POST", {
      action: "record",
      ruleId: rule.id,
      memberId: member.id,
      amount: rule.amount,
      date: String(formData.get("penaltyDate") || new Date().toISOString().split("T")[0]),
      note: String(formData.get("penaltyNote") || "") || undefined,
    });
    if (!error) {
      await refetchSummary();
      setIsPenaltyFormOpen(false);
    }
  }

  async function handleTogglePenaltyPaid(recordId: string) {
    const record = penaltyRecords.find((r) => r.id === recordId);
    if (!record) return;

    const { error } = await apiMutate("/api/penalties", "PUT", {
      id: recordId,
      isPaid: !record.isPaid,
    });
    if (!error) {
      await refetchSummary();
    }
  }

  async function handleDeletePenaltyRecord(recordId: string) {
    const { error } = await apiMutate(`/api/penalties?id=${recordId}&type=record`, "DELETE");
    if (!error) {
      await refetchSummary();
    }
  }

  const penaltySummary = useMemo(() => {
    const total = penaltyRecords.reduce((sum, r) => sum + r.amount, 0);
    const paid = penaltyRecords.filter((r) => r.isPaid).reduce((sum, r) => sum + r.amount, 0);
    const unpaid = total - paid;
    return { total, paid, unpaid, count: penaltyRecords.length };
  }, [penaltyRecords]);

  if (loading) {
    return (
      <div className="grid gap-5 stagger-children">
        <Card className="p-6"><div className="space-y-4">
          <div className="flex items-center justify-between"><Skeleton className="h-5 w-32"/><Skeleton className="h-8 w-24"/></div>
          <Skeleton className="h-10 w-48"/>
          <Skeleton className="h-3 w-40"/>
        </div></Card>
        <Card className="p-6"><div className="space-y-3">
          <Skeleton className="h-5 w-24"/>
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full"/>)}
        </div></Card>
      </div>
    );
  }

  return (
    <div className="grid gap-5 stagger-children">
      {/* ── Section 1: 회비 현황 (always visible) ── */}
      <Card className="p-6">
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
              <p className="text-[10px] text-muted-foreground">
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
                  className="rounded-lg p-1.5 hover:bg-secondary transition-colors"
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
                  className="rounded-lg p-1.5 hover:bg-secondary transition-colors"
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
      <div className="sticky top-0 z-10 -mx-1 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex" role="tablist">
          {([
            { key: "records" as const, label: "입출금", staffOnly: false },
            { key: "status" as const, label: "납부현황", staffOnly: true },
            { key: "bulk" as const, label: "내역 올리기", staffOnly: true },
            { key: "settings" as const, label: "설정", staffOnly: true },
          ]).filter((tab) => !tab.staffOnly || isStaffOrAbove(role)).map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={duesTab === tab.key}
              onClick={() => setDuesTab(tab.key as typeof duesTab)}
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

      {duesTab === "records" && (
      <>
      {/* ── Section 2: 입출금 기록 입력 (collapsible, staff only) ── */}
      {isStaffOrAbove(role) && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => { setIsFormOpen((prev) => { if (!prev) setFormErrors({}); return !prev; }); }}
          >
            {isFormOpen ? "입력 닫기" : "입출금 기록 추가"}
          </Button>
        </div>
      )}
      {isFormOpen ? (
        <Card className="p-6">
          <h3 className="font-heading text-base sm:text-lg font-bold uppercase text-foreground">
            입출금 기록 입력
          </h3>

          <form
            className="mt-4 grid gap-4"
            action={(formData) => handleAddRecord(formData)}
          >
            <Card className="border-0 bg-secondary p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-semibold text-muted-foreground">
                    구분
                  </Label>
                  <NativeSelect name="type">
                    <option value="INCOME">입금</option>
                    <option value="EXPENSE">출금</option>
                  </NativeSelect>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-muted-foreground">
                    금액
                  </Label>
                  <Input
                    name="amount"
                    type="number"
                    min={0}
                    required
                    className={formErrors.amount ? "border-destructive" : ""}
                    onChange={() => setFormErrors((prev) => ({ ...prev, amount: "" }))}
                  />
                  {formErrors.amount && <p className="text-xs text-destructive">{formErrors.amount}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-muted-foreground">
                    날짜
                  </Label>
                  <Input
                    name="recordedAt"
                    type="date"
                    required
                    className={formErrors.recordedAt ? "border-destructive" : ""}
                    onChange={() => setFormErrors((prev) => ({ ...prev, recordedAt: "" }))}
                  />
                  {formErrors.recordedAt && <p className="text-xs text-destructive">{formErrors.recordedAt}</p>}
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    💡 내용에 팀원 이름이 포함되면 해당 팀원의 납부 기록으로 자동 연결됩니다.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label className="font-semibold text-muted-foreground">
                  내용
                </Label>
                <Input
                  name="description"
                  required
                  placeholder="예: 2월 회비 납부"
                />
              </div>

              <div className="mt-4 space-y-2">
                <Label className="font-semibold text-muted-foreground">
                  결제 수단
                </Label>
                <Input name="method" placeholder="예: 카카오뱅크, 현금" />
              </div>

              <div className="mt-4 space-y-2">
                <Label className="font-semibold text-muted-foreground">
                  스크린샷 첨부
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="text-xs"
                />
              </div>

              {screenshotUrl && (
                <Card className="mt-4 border-0 bg-secondary p-3">
                  <p className="mb-2 text-xs text-muted-foreground">미리보기</p>
                  <img
                    src={screenshotUrl}
                    alt="스크린샷 미리보기"
                    className="max-h-40 rounded-xl object-contain"
                  />
                </Card>
              )}
            </Card>

            <Button type="submit" className="w-full" size="lg" disabled={saving}>
              {saving ? "저장 중..." : "저장하기"}
            </Button>
          </form>
        </Card>
      ) : null}
      </>
      )}

      {duesTab === "bulk" && (
      <>
      {/* ── 엑셀 업로드 ── */}
      <Card className="p-6">
        <h3 className="font-heading text-base sm:text-lg font-bold uppercase text-foreground">
          엑셀 파일 업로드
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          은행 앱에서 다운로드한 거래 내역 엑셀을 올려주세요. 날짜·금액·내용이 자동으로 분류됩니다. (카카오뱅크 형식에 최적화)
        </p>
        <div className="mt-4">
          <input
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setExcelLoading(true);
              setExcelRecords([]);
              setExcelBalance(null);
              try {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch("/api/dues/excel", { method: "POST", body: formData });
                const json = await res.json();
                if (!res.ok) {
                  showToast(json.error || "엑셀 파싱 실패", "error");
                  return;
                }
                // 기존 회비 내역과 중복 체크
                const existingRecords = summaryData?.records ?? [];
                const existingKeys = new Set(
                  existingRecords.map((r: any) => `${r.recordedAt?.split("T")[0]}_${r.amount}_${r.type}`)
                );
                const filtered = json.records.filter((r: any) => {
                  const key = `${r.date}_${r.amount}_${r.type}`;
                  return !existingKeys.has(key);
                });
                const dupCount = json.totalCount - filtered.length;
                setExcelRecords(filtered);
                setExcelBalance(json.lastBalance);
                if (dupCount > 0) {
                  showToast(`${json.totalCount}건 중 ${dupCount}건 중복 제외, ${filtered.length}건 새 내역`, "info");
                } else {
                  showToast(`${json.totalCount}건의 거래 내역을 인식했습니다.`, "success");
                }
              } catch {
                showToast("엑셀 파일 처리 중 오류가 발생했습니다.", "error");
              } finally {
                setExcelLoading(false);
              }
            }}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-xs file:font-bold file:text-primary hover:file:bg-primary/20"
          />
        </div>

        {excelLoading && (
          <div className="mt-4 flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <span className="text-sm text-muted-foreground">파싱 중...</span>
          </div>
        )}

        {(excelRecords.length > 0 || excelBalance !== null) && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">
                {excelRecords.length > 0 ? `${excelRecords.length}건 새 내역` : "새 내역 없음 (모두 중복)"}
              </p>
              {excelBalance !== null && (
                <p className="text-xs text-muted-foreground">
                  최종 잔액: <span className="font-bold text-primary">{excelBalance.toLocaleString()}원</span>
                </p>
              )}
            </div>
            {excelRecords.length > 0 && (
              <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg bg-secondary p-3">
                {excelRecords.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-1 text-xs">
                    <div className="min-w-0 flex-1">
                      <span className="text-muted-foreground">{r.date}</span>
                      <span className="ml-2 text-foreground">{r.description}</span>
                    </div>
                    <span className={cn(
                      "ml-2 shrink-0 font-bold",
                      r.type === "INCOME" ? "text-[hsl(var(--success))]" : "text-[hsl(var(--loss))]"
                    )}>
                      {r.type === "INCOME" ? "+" : "-"}{r.amount.toLocaleString()}원
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Button
              className="w-full"
              onClick={async () => {
                setBulkSaving(true);
                try {
                  let successCount = 0;
                  for (let i = 0; i < excelRecords.length; i++) {
                    const r = excelRecords[i];
                    setBulkProgress(`저장 중... (${i + 1}/${excelRecords.length})`);
                    const { error } = await apiMutate("/api/dues", "POST", {
                      teamId: undefined,
                      type: r.type,
                      amount: r.amount,
                      description: r.description,
                      userId: autoMatchMember(r.description),
                      recordedAt: r.date,
                    });
                    if (!error) successCount++;
                  }
                  // 잔고 업데이트
                  if (excelBalance !== null) {
                    await apiMutate("/api/dues/balance", "POST", { balance: excelBalance });
                  }
                  const msg = excelRecords.length > 0
                    ? `${successCount}건 저장 완료${excelBalance !== null ? " · 잔고 업데이트됨" : ""}`
                    : "잔고가 업데이트되었습니다.";
                  showToast(msg, "success");
                  setExcelRecords([]);
                  setExcelBalance(null);
                  await refetchSummary();
                  await syncPaymentStatus();
                } catch {
                  showToast("저장 중 오류가 발생했습니다.", "error");
                } finally {
                  setBulkSaving(false);
                  setBulkProgress("");
                }
              }}
              disabled={bulkSaving}
            >
              {bulkSaving ? (bulkProgress || "저장 중...") : excelRecords.length > 0
                ? `${excelRecords.length}건 저장${excelBalance !== null ? " + 잔고 업데이트" : ""}`
                : "잔고 업데이트"}
            </Button>
          </div>
        )}
      </Card>

      {/* ── Section 2.5: 스크린샷 일괄 등록 ── */}
        <Card className="p-6" ref={bulkSectionRef}>
          <h3 className="font-heading text-base sm:text-lg font-bold uppercase text-foreground">
            스크린샷 보고 일괄 등록
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            은행 앱 캡쳐를 올리면 자동으로 거래 내역을 인식합니다. 인식 결과를 확인 후 저장하세요.
          </p>
          {ocrLoading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-background p-8 shadow-2xl">
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-[hsl(var(--info))]" />
                <p className="text-base font-semibold text-foreground">거래 내역 인식 중...</p>
                <p className="text-sm text-muted-foreground">은행 앱 스크린샷을 인식하고 있습니다.</p>
                <button
                  type="button"
                  onClick={() => { setOcrLoading(false); setOcrStatus("취소됨"); }}
                  className="mt-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}
          {!ocrLoading && ocrStatus && (
            <div className={cn(
              "mt-2 rounded-lg px-3 py-2 text-xs font-medium",
              ocrStatus.includes("오류") || ocrStatus.includes("못했") || ocrStatus.includes("실패")
                ? "bg-destructive/10 text-destructive"
                : "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
            )}>
              {ocrStatus}
            </div>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-[300px_1fr]">
            {/* 이미지 업로드 & 미리보기 */}
            <div className="space-y-3">
              <Input
                type="file"
                accept="image/*"
                onChange={handleBulkImageChange}
                className="text-xs"
              />
              {bulkImage && (
                <div className="max-h-[500px] overflow-auto rounded-lg border">
                  <Image src={bulkImage} alt="거래내역 스크린샷" width={600} height={800} className="w-full" unoptimized />
                </div>
              )}
            </div>

            {/* 일괄 입력 테이블 */}
            <div className="space-y-3">
              <div className="space-y-2">
                {bulkRows.map((row, index) => {
                  const errs = bulkErrors[index] ?? [];
                  return (
                  <Card key={index} className="border-0 bg-secondary p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                      <Input
                        type="date"
                        value={row.date}
                        onChange={(e) => { updateBulkRow(index, "date", e.target.value); setBulkErrors((p) => { const n = { ...p }; delete n[index]; return n; }); }}
                        className={cn("text-xs", errs.includes("date") && "border-destructive")}
                        placeholder="날짜"
                      />
                      <NativeSelect
                        value={row.type}
                        onChange={(e) => updateBulkRow(index, "type", e.target.value as "INCOME" | "EXPENSE")}
                        className="text-xs"
                      >
                        <option value="INCOME">입금</option>
                        <option value="EXPENSE">출금</option>
                      </NativeSelect>
                      <Input
                        type="number"
                        value={row.amount}
                        onChange={(e) => { updateBulkRow(index, "amount", e.target.value); setBulkErrors((p) => { const n = { ...p }; delete n[index]; return n; }); }}
                        className={cn("text-xs", errs.includes("amount") && "border-destructive")}
                        placeholder="금액"
                        min={0}
                      />
                      <Input
                        value={row.description}
                        onChange={(e) => { updateBulkRow(index, "description", e.target.value); setBulkErrors((p) => { const n = { ...p }; delete n[index]; return n; }); }}
                        className={cn("text-xs", errs.includes("description") && "border-destructive")}
                        placeholder="내용 (예: 3월 회비)"
                      />
                      <button
                        type="button"
                        onClick={() => removeBulkRow(index)}
                        className="min-h-[36px] min-w-[36px] rounded px-2 text-xs text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors self-center"
                      >
                        삭제
                      </button>
                    </div>
                  </Card>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={addBulkRow}>
                  + 행 추가
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleBulkSave}
                  disabled={bulkSaving || bulkRows.every((r) => !r.amount || !r.description)}
                >
                  {bulkSaving ? "저장 중..." : `${bulkRows.filter((r) => r.amount && r.description).length}건 일괄 저장`}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </>
      )}

      {duesTab === "records" && (
      <>
      {/* ── Section 3: 입출금 내역 ── */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-bold uppercase text-foreground">
              입출금 내역
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="이전 달"
                onClick={() => {
                  const [y, m] = monthFilter.split("-").map(Number);
                  const prev = new Date(y, m - 2);
                  setMonthFilter(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
                }}
                className="rounded-lg p-1.5 hover:bg-secondary transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[80px] text-center text-sm font-medium">
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
                className="rounded-lg p-1.5 hover:bg-secondary transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Input
              type="text"
              value={memberFilter}
              onChange={(event) => setMemberFilter(event.target.value)}
              placeholder="이름 검색"
              className="w-28 text-xs"
            />
            {(["ALL", "INCOME", "EXPENSE"] as RecordFilter[]).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={filter === value ? "default" : "outline"}
                onClick={() => setFilter(value)}
              >
                {value === "ALL" ? "전체" : value === "INCOME" ? "입금" : "출금"}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">아직 거래 내역이 없습니다.</p>
            </div>
          ) : filteredRecords.map((record) =>
            editingRecord?.id === record.id ? (
              <Card key={record.id} data-edit-id={record.id} className="border-0 bg-secondary p-4">
                <form className="grid gap-3" action={(fd) => handleUpdateRecord(fd)}>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <NativeSelect name="editType" defaultValue={record.type}>
                      <option value="INCOME">입금</option>
                      <option value="EXPENSE">출금</option>
                    </NativeSelect>
                    <Input name="editAmount" type="number" defaultValue={record.amount} min={0} required placeholder="금액" />
                    <Input name="editDate" type="date" defaultValue={record.recordedAt.split("T")[0]} />
                    <Input name="editTime" type="time" defaultValue={record.recordedAt.includes("T") ? record.recordedAt.split("T")[1]?.slice(0, 5) : ""} />
                  </div>
                  <Input name="editDescription" defaultValue={record.description} required placeholder="내용" />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingRecord(null)}>취소</Button>
                    <Button type="submit" size="sm">저장</Button>
                  </div>
                </form>
              </Card>
            ) : (
              <div
                key={record.id}
                className="card-list-item flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {record.description}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {record.recordedAt.split("T")[0]}
                    {record.memberName ? ` · ${record.memberName}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={cn(
                      "rounded-lg px-3 py-1 text-xs font-bold font-[family-name:var(--font-display)] whitespace-nowrap",
                      record.type === "INCOME"
                        ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                        : "bg-[hsl(var(--loss))]/15 text-[hsl(var(--loss))]"
                    )}
                  >
                    {record.type === "INCOME" ? "+" : "-"}
                    {record.amount.toLocaleString()}원
                  </span>
                  {isStaffOrAbove(role) && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRecord(record);
                          setTimeout(() => {
                            document.querySelector(`[data-edit-id="${record.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }, 100);
                        }}
                        className="min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ message: "이 내역을 삭제하시겠습니까?", onConfirm: () => handleDeleteRecord(record.id) })}
                        className="min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </Card>
      </>
      )}

      {duesTab === "status" && (
      <>
      {/* ── 납부현황 탭 ── */}
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
              className="rounded-lg p-1.5 hover:bg-secondary transition-colors"
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
              className="rounded-lg p-1.5 hover:bg-secondary transition-colors"
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
            <p className="mt-1 text-[10px] text-muted-foreground">
              납부 기간: {from} ~ {to}
            </p>
          );
        })()}

        {/* 경고: 회비 기준 미설정 */}
        {settings.length === 0 && (
          <div className="mt-3 rounded-lg bg-[hsl(var(--warning))]/10 px-3 py-2">
            <p className="text-[11px] text-[hsl(var(--warning))]">
              회비 기준이 설정되지 않았습니다.{" "}
              <button type="button" onClick={() => setDuesTab("settings")} className="underline font-bold">
                설정 탭에서 추가
              </button>
            </p>
          </div>
        )}

        {loadingPaymentStatus ? (
          <div className="mt-3 space-y-1">
            {Array.from({ length: Math.min(members.length || 5, 10) }).map((_, i) => (
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
              <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-medium text-foreground whitespace-nowrap">{m.name}</span>
                  {ROLE_LABEL[m.role] && (
                    <span className={cn(
                      "shrink-0 rounded px-1 py-px text-[9px] font-bold",
                      m.role === "OWNER" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                    )}>
                      {ROLE_LABEL[m.role]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {m.paidAmount > 0 && (
                    <span className="mr-1 text-[10px] font-medium text-[hsl(var(--success))]">
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
                          "rounded-full px-3 py-1.5 min-h-[36px] text-[10px] font-bold transition-all",
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
                      "rounded-full px-2.5 py-1 text-[10px] font-bold",
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
      </>
      )}

      {duesTab === "settings" && (
      <>
      {/* ── 납부 기준일 설정 ── */}
      {isStaffOrAbove(role) && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-foreground">납부 기준일</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            매월 회비 납부 기간의 시작일. 예: 25일 → 2/25~3/24를 3월 회비로 인식.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">매월</span>
            <Input
              type="number"
              min={1}
              max={28}
              className="w-20 text-center text-sm"
              defaultValue={periodConfig.startDay}
              onBlur={async (e) => {
                const val = Math.max(1, Math.min(28, Number(e.target.value) || 1));
                if (val === periodConfig.startDay) return;
                if (periodConfig.id) {
                  // 기존 설정 수정
                  await apiMutate("/api/dues-settings", "PUT", {
                    id: periodConfig.id,
                    memberType: "__PERIOD__",
                    monthlyAmount: val,
                    description: "납부 기준일",
                  });
                } else {
                  // 신규 생성
                  await apiMutate("/api/dues-settings", "POST", {
                    memberType: "__PERIOD__",
                    monthlyAmount: val,
                    description: "납부 기준일",
                  });
                }
                await refetchSummary();
                showToast(`납부 기준일: 매월 ${val}일로 설정됨`, "success");
              }}
            />
            <span className="text-xs text-muted-foreground">일부터</span>
          </div>
          {periodConfig.startDay > 1 && (() => {
            const { from, to } = getDuesPeriod(monthFilter, periodConfig.startDay);
            return (
              <p className="mt-2 text-[11px] text-primary">
                {monthFilter.replace("-", "년 ")}월 회비 기간: {from} ~ {to}
              </p>
            );
          })()}
        </Card>
      )}

      {/* ── Section 4: 회비 기준 설정 ── */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-bold uppercase text-foreground">
              회비 기준 설정
            </h3>
          </div>
          {isStaffOrAbove(role) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSettingOpen((prev) => !prev)}
            >
              기준 추가
            </Button>
          )}
        </div>

        {isSettingOpen ? (
          <form
            className="mt-4 grid gap-4"
            action={(formData) => handleAddSetting(formData)}
          >
            <Card className="border-0 bg-secondary p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-semibold text-muted-foreground">
                    회원 유형
                  </Label>
                  <Input
                    name="memberType"
                    required
                    placeholder="예: 직장인"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-muted-foreground">
                    월 회비
                  </Label>
                  <Input
                    name="monthlyAmount"
                    type="number"
                    min={0}
                    required
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label className="font-semibold text-muted-foreground">
                  설명
                </Label>
                <Input
                  name="description"
                  placeholder="예: 학생 할인 적용"
                />
              </div>
            </Card>

            <Button type="submit" className="w-full" size="lg" disabled={savingSetting}>
              {savingSetting ? "저장 중..." : "기준 저장"}
            </Button>
          </form>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {settings.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">아직 회비 기준이 없습니다. 위에서 기준을 추가해주세요.</p>
            </div>
          )}
          {settings.map((setting) =>
            editingSetting?.id === setting.id ? (
              <Card key={setting.id} className="border-0 bg-secondary p-4">
                <form onSubmit={handleUpdateSetting} className="grid gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">회원 유형</Label>
                    <Input
                      value={settingFormState.memberType}
                      onChange={(e) => setSettingFormState((prev) => ({ ...prev, memberType: e.target.value }))}
                      required
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">월 회비</Label>
                    <Input
                      type="number"
                      min={0}
                      value={settingFormState.monthlyAmount}
                      onChange={(e) => setSettingFormState((prev) => ({ ...prev, monthlyAmount: e.target.value }))}
                      required
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">설명</Label>
                    <Input
                      value={settingFormState.description}
                      onChange={(e) => setSettingFormState((prev) => ({ ...prev, description: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">저장</Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleCancelEditSetting}>취소</Button>
                  </div>
                </form>
              </Card>
            ) : (
              <Card
                key={setting.id}
                className="border-0 bg-secondary p-4"
              >
                <p className="text-sm font-bold text-foreground">
                  {setting.memberType}
                </p>
                <p className="mt-2 font-heading text-lg font-bold text-foreground">
                  {setting.monthlyAmount.toLocaleString()}원
                </p>
                <p className="text-xs text-muted-foreground">
                  {setting.description}
                </p>
                {isStaffOrAbove(role) && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditSetting(setting)}
                      className="min-h-[36px] min-w-[36px] rounded px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ message: "이 회비 기준을 삭제하시겠습니까?", onConfirm: () => handleDeleteSetting(setting.id) })}
                      className="min-h-[36px] min-w-[36px] rounded px-2 text-xs text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </Card>
            )
          )}
        </div>
      </Card>
      </>
      )}


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
