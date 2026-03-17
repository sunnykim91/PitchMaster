"use client";

import { useRef, useMemo, useState } from "react";
import { useApi, apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { useToast } from "@/lib/ToastContext";
import type { Role } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  pre_name: string | null;
  users: { id: string; name: string } | null;
};

type ApiMember = {
  id: string;
  name: string;
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

export default function DuesClient({ userRole }: { userRole?: Role }) {
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
  } = useApi<DuesSummary>("/api/dues/summary", {
    records: [],
    balance: null,
    balanceUpdatedAt: null,
    settings: [],
    penaltyRules: [],
    penaltyRecords: [],
  });

  const {
    data: membersRaw,
    loading: loadingMembers,
  } = useApi<{ members: ApiMemberRow[] }>("/api/members", { members: [] });

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
      summaryData.settings.map((s) => ({
        id: s.id,
        memberType: s.member_type,
        monthlyAmount: s.monthly_amount,
        description: s.description ?? "",
      })),
    [summaryData.settings]
  );

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
        })),
    [membersRaw.members],
  );

  /* ── Local UI state ── */
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
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [editingRecord, setEditingRecord] = useState<DuesRecord | null>(null);
  const bulkSectionRef = useRef<HTMLDivElement>(null);

  const loading = loadingSummary || loadingMembers;

  /** 월별 필터 적용된 레코드 */
  const monthRecords = useMemo(() => {
    if (!monthFilter) return records;
    return records.filter((r) => r.recordedAt.startsWith(monthFilter));
  }, [records, monthFilter]);

  const filteredRecords = useMemo(() => {
    let list = filter === "ALL" ? monthRecords : monthRecords.filter((item) => item.type === filter);
    if (memberFilter.trim()) {
      list = list.filter((item) => item.memberName?.includes(memberFilter.trim()));
    }
    return [...list].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  }, [filter, monthRecords, memberFilter]);

  async function handleAddRecord(formData: FormData) {
    const type = String(formData.get("type"));
    const amount = Number(formData.get("amount"));
    const description = String(formData.get("description"));
    const userId = String(formData.get("memberName") || "") || undefined;
    const screenshotUrlValue = screenshotUrl || undefined;

    const { error } = await apiMutate("/api/dues", "POST", {
      type,
      amount,
      description,
      userId,
      screenshotUrl: screenshotUrlValue,
    });
    if (!error) {
      await refetchSummary();
      setIsFormOpen(false);
      setScreenshotUrl("");
    }
  }

  async function handleAddSetting(formData: FormData) {
    const memberType = String(formData.get("memberType"));
    const monthlyAmount = Number(formData.get("monthlyAmount"));
    const description = String(formData.get("description") || "");

    const { error } = await apiMutate("/api/dues-settings", "POST", {
      memberType,
      monthlyAmount,
      description,
    });
    if (!error) {
      await refetchSummary();
      setIsSettingOpen(false);
    }
  }

  /* ── 일괄 등록 핸들러 ── */

  async function handleBulkImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setBulkImage(imageUrl);

    // Clova OCR API 호출
    setOcrLoading(true);
    setOcrStatus("Naver Clova OCR로 분석 중...");
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const json = await res.json();
      console.log("OCR response:", res.status, json);

      if (!res.ok) {
        setOcrStatus(`OCR 서버 오류 (${res.status}): ${json.error || "알 수 없는 오류"}. 수동으로 입력해주세요.`);
        return;
      }

      if (!json.text) {
        setOcrStatus("OCR 응답에 텍스트가 없습니다. 수동으로 입력해주세요.");
        return;
      }

      const { rows: parsed, latestBalance } = parseTransactions(json.text);
      console.log("Parsed transactions:", parsed, "Balance:", latestBalance);
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
    } catch (err) {
      console.error("OCR error:", err);
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
    if (!confirm("이 입출금 내역을 삭제하시겠습니까?")) return;
    const { error } = await apiMutate(`/api/dues?id=${id}`, "DELETE");
    if (!error) await refetchSummary();
  }

  async function handleUpdateRecord(formData: FormData) {
    if (!editingRecord) return;
    const type = String(formData.get("editType")) as "INCOME" | "EXPENSE";
    const amount = Number(formData.get("editAmount"));
    const description = String(formData.get("editDescription"));
    const recordedAt = String(formData.get("editDate") || "");
    const recordedTime = String(formData.get("editTime") || "");
    const userId = String(formData.get("editMember") || "") || undefined;

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
    return <Card className="p-6">불러오는 중...</Card>;
  }

  return (
    <div className="grid gap-5">
      {/* ── Section 1: 회비 현황 ── */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400">
              Finance
            </p>
            <h2 className="mt-1 font-heading text-2xl font-bold uppercase text-foreground">
              회비 현황
            </h2>
          </div>
          {isStaffOrAbove(role) && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsBulkMode((prev) => {
                    if (!prev) setTimeout(() => bulkSectionRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                    return !prev;
                  });
                  setIsFormOpen(false);
                }}
              >
                스크린샷 일괄 등록
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => { setIsFormOpen((prev) => !prev); setIsBulkMode(false); }}
              >
                입출금 기록 추가
              </Button>
            </div>
          )}
        </div>

        <Card className="mt-5 border-blue-500/20 bg-blue-500/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-400/80">통장 잔고</p>
              <p className="mt-1 font-heading text-3xl font-bold text-blue-300">
                {summaryData.balance !== null
                  ? `${summaryData.balance.toLocaleString()}원`
                  : "스크린샷을 업로드하면 자동 반영됩니다"}
              </p>
            </div>
            {summaryData.balanceUpdatedAt && (
              <p className="text-[10px] text-blue-400/50">
                {new Date(summaryData.balanceUpdatedAt).toLocaleString("ko-KR")} 기준
              </p>
            )}
          </div>
        </Card>
      </Card>

      {/* ── Section 2: 입출금 기록 입력 (collapsible, staff only) ── */}
      {isFormOpen ? (
        <Card className="p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400">
            New Record
          </p>
          <h3 className="mt-1 font-heading text-lg font-bold uppercase text-foreground">
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
                  <Input name="amount" type="number" min={0} required />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-muted-foreground">
                    날짜
                  </Label>
                  <Input name="recordedAt" type="date" required />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-muted-foreground">
                    입금자/출금자
                  </Label>
                  <NativeSelect name="memberName">
                    <option value="">선택 안 함</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </NativeSelect>
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

            <Button type="submit" className="w-full" size="lg">
              저장하기
            </Button>
          </form>
        </Card>
      ) : null}

      {/* ── Section 2.5: 스크린샷 일괄 등록 ── */}
      {isBulkMode && (
        <Card className="p-6" ref={bulkSectionRef}>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-blue-400">
            Bulk Import
          </p>
          <h3 className="mt-1 font-heading text-lg font-bold uppercase text-foreground">
            스크린샷 보고 일괄 등록
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            은행 앱 캡쳐를 올리면 자동으로 거래 내역을 인식합니다. 인식 결과를 확인 후 저장하세요.
          </p>
          {ocrLoading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-background p-8 shadow-2xl">
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-blue-400" />
                <p className="text-base font-semibold text-foreground">OCR 분석 중...</p>
                <p className="text-sm text-muted-foreground">은행 앱 스크린샷을 인식하고 있습니다.</p>
              </div>
            </div>
          )}
          {!ocrLoading && ocrStatus && (
            <div className={cn(
              "mt-2 rounded-lg px-3 py-2 text-xs font-medium",
              ocrStatus.includes("오류") || ocrStatus.includes("못했") || ocrStatus.includes("실패")
                ? "bg-destructive/10 text-destructive"
                : "bg-emerald-500/10 text-emerald-400"
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
                  <img src={bulkImage} alt="거래내역 스크린샷" className="w-full" />
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
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
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
                      <NativeSelect
                        value={row.memberName}
                        onChange={(e) => updateBulkRow(index, "memberName", e.target.value)}
                        className="text-xs"
                      >
                        <option value="">입금자/출금자</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </NativeSelect>
                      <button
                        type="button"
                        onClick={() => removeBulkRow(index)}
                        className="text-xs text-destructive/70 hover:text-destructive transition self-center"
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
      )}

      {/* ── Section 3: 입출금 내역 ── */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400">
              History
            </p>
            <h3 className="mt-1 font-heading text-xl font-bold uppercase text-foreground">
              입출금 내역
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-36 text-xs"
            />
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
          {filteredRecords.map((record) =>
            editingRecord?.id === record.id ? (
              <Card key={record.id} className="border-0 bg-secondary p-4">
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
                  <div className="grid grid-cols-2 gap-2">
                    <Input name="editDescription" defaultValue={record.description} required placeholder="내용" />
                    <NativeSelect name="editMember" defaultValue="">
                      <option value="">입금자/출금자</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">저장</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingRecord(null)}>취소</Button>
                  </div>
                </form>
              </Card>
            ) : (
              <Card
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-3 border-0 bg-secondary px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {record.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {record.recordedAt.split("T")[0]}
                    {record.memberName ? ` · ${record.memberName}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "rounded-lg px-3 py-1 text-xs font-bold",
                      record.type === "INCOME"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-rose-500/15 text-rose-400"
                    )}
                  >
                    {record.type === "INCOME" ? "+" : "-"}
                    {record.amount.toLocaleString()}원
                  </Badge>
                  {isStaffOrAbove(role) && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingRecord(record)}
                        className="text-xs text-muted-foreground hover:text-foreground transition"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(record.id)}
                        className="text-xs text-destructive/70 hover:text-destructive transition"
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </Card>
            )
          )}
        </div>
      </Card>

      {/* ── Section 4: 회비 기준 설정 ── */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400">
              Standards
            </p>
            <h3 className="mt-1 font-heading text-xl font-bold uppercase text-foreground">
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

            <Button type="submit" className="w-full" size="lg">
              기준 저장
            </Button>
          </form>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {settings.map((setting) => (
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
            </Card>
          ))}
        </div>
      </Card>

      {/* ── Section 5: 벌금 관리 ── */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-rose-400">
              Penalties
            </p>
            <h3 className="mt-1 font-heading text-xl font-bold uppercase text-foreground">
              벌금 관리
            </h3>
          </div>
          {isStaffOrAbove(role) && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPenaltyRuleOpen((prev) => !prev)}
              >
                규칙 관리
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsPenaltyFormOpen((prev) => !prev)}
              >
                벌금 부과
              </Button>
            </div>
          )}
        </div>

        {/* 벌금 현황 요약 */}
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Card className="border-0 bg-rose-500/10 p-4">
            <p className="text-xs text-rose-400/80">총 벌금</p>
            <p className="mt-1 font-heading text-2xl font-bold text-rose-400">
              {penaltySummary.total.toLocaleString()}원
            </p>
          </Card>
          <Card className="border-0 bg-emerald-500/10 p-4">
            <p className="text-xs text-emerald-400/80">납부 완료</p>
            <p className="mt-1 font-heading text-2xl font-bold text-emerald-400">
              {penaltySummary.paid.toLocaleString()}원
            </p>
          </Card>
          <Card className="border-0 bg-amber-500/10 p-4">
            <p className="text-xs text-amber-400/80">미납</p>
            <p className="mt-1 font-heading text-2xl font-bold text-amber-300">
              {penaltySummary.unpaid.toLocaleString()}원
            </p>
          </Card>
        </div>

        {/* 벌금 규칙 관리 (collapsible, staff only) */}
        {isPenaltyRuleOpen && (
          <div className="mt-4">
            <form
              className="grid gap-4"
              action={(formData) => handleAddPenaltyRule(formData)}
            >
              <Card className="border-0 bg-secondary p-5">
                <p className="mb-3 text-sm font-bold text-foreground">벌금 규칙 추가</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="font-semibold text-muted-foreground">항목명</Label>
                    <Input name="penaltyName" required placeholder="예: 무단불참" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-muted-foreground">금액</Label>
                    <Input name="penaltyAmount" type="number" min={0} required placeholder="5000" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-muted-foreground">설명</Label>
                    <Input name="penaltyDescription" placeholder="사전 연락 없이 불참" />
                  </div>
                </div>
                <Button type="submit" className="mt-3 w-full" size="sm">
                  규칙 추가
                </Button>
              </Card>
            </form>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {penaltyRules.map((rule) => (
                <Card key={rule.id} className="border-0 bg-secondary">
                  <CardContent className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.amount.toLocaleString()}원
                        {rule.description ? ` · ${rule.description}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePenaltyRule(rule.id)}
                      className="text-xs text-destructive/70 hover:text-destructive transition"
                    >
                      삭제
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 벌금 부과 폼 (collapsible, staff only) */}
        {isPenaltyFormOpen && (
          <form
            className="mt-4 grid gap-4"
            action={(formData) => handleAddPenaltyRecord(formData)}
          >
            <Card className="border-0 bg-secondary p-5">
              <p className="mb-3 text-sm font-bold text-foreground">벌금 부과</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-semibold text-muted-foreground">대상 회원</Label>
                  <NativeSelect name="penaltyMemberId">
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-muted-foreground">벌금 항목</Label>
                  <NativeSelect name="penaltyRuleId">
                    {penaltyRules.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.amount.toLocaleString()}원)
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-muted-foreground">날짜</Label>
                  <Input name="penaltyDate" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-muted-foreground">비고</Label>
                  <Input name="penaltyNote" placeholder="추가 메모" />
                </div>
              </div>
              <Button type="submit" className="mt-3 w-full" size="sm">
                벌금 부과
              </Button>
            </Card>
          </form>
        )}

        {/* 벌금 내역 */}
        <div className="mt-4 space-y-2">
          {penaltyRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">벌금 내역이 없습니다.</p>
          ) : (
            penaltyRecords.map((record) => (
              <Card
                key={record.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 border-0 px-4 py-3",
                  record.isPaid ? "bg-secondary/60" : "bg-secondary"
                )}
              >
                <div className="min-w-0">
                  <p className={cn(
                    "text-sm font-semibold",
                    record.isPaid ? "text-muted-foreground line-through" : "text-foreground"
                  )}>
                    {record.memberName} — {record.ruleName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {record.date}
                    {record.note ? ` · ${record.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "rounded-lg px-3 py-1 text-xs font-bold",
                      record.isPaid
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-rose-500/15 text-rose-400"
                    )}
                  >
                    {record.isPaid ? "납부" : "미납"} {record.amount.toLocaleString()}원
                  </Badge>
                  {isStaffOrAbove(role) && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleTogglePenaltyPaid(record.id)}
                      >
                        {record.isPaid ? "미납 처리" : "납부 확인"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDeletePenaltyRecord(record.id)}
                        className="text-xs text-destructive/70 hover:text-destructive transition"
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
