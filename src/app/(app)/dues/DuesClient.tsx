"use client";

import { useMemo, useState } from "react";
import { useApi, apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
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

  /* ── API data fetching ── */
  const {
    data: duesData,
    loading: loadingDues,
    refetch: refetchDues,
  } = useApi<{ records: ApiDuesRecord[] }>("/api/dues", { records: [] });

  const {
    data: settingsData,
    loading: loadingSettings,
    refetch: refetchSettings,
  } = useApi<{ settings: ApiDuesSetting[] }>("/api/dues-settings", { settings: [] });

  const {
    data: rulesData,
    loading: loadingRules,
    refetch: refetchRules,
  } = useApi<{ rules: ApiPenaltyRule[] }>("/api/penalties?type=rules", { rules: [] });

  const {
    data: penRecordsData,
    loading: loadingPenRecords,
    refetch: refetchPenRecords,
  } = useApi<{ records: ApiPenaltyRecord[] }>("/api/penalties?type=records", { records: [] });

  const {
    data: membersData,
    loading: loadingMembers,
  } = useApi<{ members: ApiMember[] }>("/api/members", { members: [] });

  /* ── Map API snake_case → camelCase ── */
  const records: DuesRecord[] = useMemo(
    () =>
      duesData.records.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        description: r.description,
        recordedAt: r.recorded_at,
        memberName: r.users?.name ?? undefined,
        method: undefined,
      })),
    [duesData.records]
  );

  const settings: DuesSetting[] = useMemo(
    () =>
      settingsData.settings.map((s) => ({
        id: s.id,
        memberType: s.member_type,
        monthlyAmount: s.monthly_amount,
        description: s.description ?? "",
      })),
    [settingsData.settings]
  );

  const penaltyRules: PenaltyRule[] = useMemo(
    () =>
      rulesData.rules.map((r) => ({
        id: r.id,
        name: r.name,
        amount: r.amount,
        description: r.description ?? undefined,
      })),
    [rulesData.rules]
  );

  const penaltyRecords: PenaltyRecord[] = useMemo(
    () =>
      penRecordsData.records.map((r) => ({
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
    [penRecordsData.records]
  );

  const members = membersData.members;

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
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");

  const loading = loadingDues || loadingSettings || loadingRules || loadingPenRecords || loadingMembers;

  const totals = useMemo(() => {
    const income = records.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + item.amount, 0);
    const expense = records.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + item.amount, 0);
    return { income, expense, balance: income - expense };
  }, [records]);

  const filteredRecords = useMemo(() => {
    let list = filter === "ALL" ? records : records.filter((item) => item.type === filter);
    if (memberFilter.trim()) {
      list = list.filter((item) => item.memberName?.includes(memberFilter.trim()));
    }
    return [...list].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  }, [filter, records, memberFilter]);

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
      await refetchDues();
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
      await refetchSettings();
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

      if (!res.ok || !json.text) {
        // Clova OCR 실패 시 Tesseract 폴백
        setOcrStatus("서버 OCR 실패, 브라우저 OCR로 전환 중...");
        await fallbackTesseract(file);
        return;
      }

      const parsed = parseTransactions(json.text);
      if (parsed.length > 0) {
        setBulkRows(parsed);
        setOcrStatus(`Clova OCR: ${parsed.length}건의 거래를 인식했습니다. 확인 후 저장하세요.`);
      } else {
        setOcrStatus("거래 내역을 인식하지 못했습니다. 수동으로 입력해주세요.");
      }
    } catch {
      // 네트워크 오류 등 → Tesseract 폴백
      setOcrStatus("서버 연결 실패, 브라우저 OCR로 전환 중...");
      await fallbackTesseract(file);
    } finally {
      setOcrLoading(false);
    }
  }

  /** Clova OCR 실패 시 Tesseract.js 폴백 */
  async function fallbackTesseract(file: File) {
    try {
      const toBase64 = (f: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
      const base64 = await toBase64(file);
      const Tesseract = await import("tesseract.js");
      setOcrStatus("브라우저 OCR 처리 중...");
      const worker = await Tesseract.createWorker("kor", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrStatus(`텍스트 인식 중... ${Math.round((m.progress ?? 0) * 100)}%`);
          }
        },
      });
      const { data } = await worker.recognize(base64);
      await worker.terminate();
      const parsed = parseTransactions(data.text);
      if (parsed.length > 0) {
        setBulkRows(parsed);
        setOcrStatus(`브라우저 OCR: ${parsed.length}건 인식. 정확도가 낮을 수 있으니 확인해주세요.`);
      } else {
        setOcrStatus("인식 실패. 수동으로 입력해주세요.");
      }
    } catch {
      setOcrStatus("OCR 처리 실패. 수동으로 입력해주세요.");
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
  function parseTransactions(ocrText: string): BulkRow[] {
    const rows: BulkRow[] = [];
    const lines = ocrText.split("\n").map((l) => l.trim()).filter(Boolean);
    const year = new Date().getFullYear();

    let currentDate = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 날짜 줄: "03.12", "03.07" 등
      const dateMatch = line.match(/^(\d{2})\.(\d{2})$/);
      if (dateMatch) {
        currentDate = `${year}-${dateMatch[1]}-${dateMatch[2]}`;
        continue;
      }

      // 거래 줄: "양문주 -79,230원", "젤로스FC 73,000원"
      // 이름(한글/영문) + 금액(원) 이 같은 줄에 있는 패턴
      const txMatch = line.match(/^(.+?)\s+([+-]?[\d,]+)원$/);
      if (!txMatch) continue;

      const name = txMatch[1].trim();
      const amountStr = txMatch[2];

      // 부호 추출
      const isExpense = amountStr.startsWith("-");
      const rawAmount = amountStr.replace(/[^0-9]/g, "");
      const num = parseInt(rawAmount, 10);
      if (!num) continue;

      // 잔액 판별: 50만원 이상이면 잔액줄로 간주 (시간+잔액)
      if (num >= 500000) continue;

      // 이름이 시간 패턴(HH:MM)이면 잔액줄이므로 스킵
      if (name.match(/^\d{1,2}:\d{2}$/)) continue;

      // 다음 줄에서 시간 추출: "10:05 1,238,592원" → "10:05"
      let time = "";
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const timeMatch = nextLine.match(/^(\d{1,2}:\d{2})/);
        if (timeMatch) {
          time = timeMatch[1];
        }
      }

      // 멤버 매칭
      const matchedMember = members.find(
        (m) => name.includes(m.name) || m.name.includes(name)
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

    return rows;
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
    const validRows = bulkRows.filter((r) => r.amount && r.description);
    if (validRows.length === 0) return;
    setBulkSaving(true);
    for (const row of validRows) {
      await apiMutate("/api/dues", "POST", {
        type: row.type,
        amount: Number(row.amount),
        description: row.description,
        userId: row.memberName || undefined,
        recordedAt: row.date || undefined,
      });
    }
    setBulkSaving(false);
    await refetchDues();
    setIsBulkMode(false);
    setBulkRows([{ date: "", time: "", type: "INCOME", amount: "", description: "", memberName: "" }]);
    setBulkImage(null);
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
      await refetchRules();
      setIsPenaltyRuleOpen(false);
    }
  }

  async function handleDeletePenaltyRule(ruleId: string) {
    const { error } = await apiMutate(`/api/penalties?id=${ruleId}&type=rule`, "DELETE");
    if (!error) {
      await refetchRules();
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
      await refetchPenRecords();
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
      await refetchPenRecords();
    }
  }

  async function handleDeletePenaltyRecord(recordId: string) {
    const { error } = await apiMutate(`/api/penalties?id=${recordId}&type=record`, "DELETE");
    if (!error) {
      await refetchPenRecords();
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
                onClick={() => { setIsBulkMode((prev) => !prev); setIsFormOpen(false); }}
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

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Card className="border-0 bg-emerald-500/10 p-4">
            <p className="text-xs text-emerald-400/80">총 수입</p>
            <p className="mt-1 font-heading text-2xl font-bold text-emerald-400">
              {totals.income.toLocaleString()}원
            </p>
          </Card>
          <Card className="border-0 bg-rose-500/10 p-4">
            <p className="text-xs text-rose-400/80">총 지출</p>
            <p className="mt-1 font-heading text-2xl font-bold text-rose-400">
              {totals.expense.toLocaleString()}원
            </p>
          </Card>
          <Card className="border-amber-500/20 bg-amber-500/10 p-4">
            <p className="text-xs text-amber-400/80">잔액</p>
            <p className="mt-1 font-heading text-2xl font-bold text-amber-300">
              {totals.balance.toLocaleString()}원
            </p>
          </Card>
        </div>
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
                    <option value="INCOME">수입</option>
                    <option value="EXPENSE">지출</option>
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
                    입금자/지출자
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
        <Card className="p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-blue-400">
            Bulk Import
          </p>
          <h3 className="mt-1 font-heading text-lg font-bold uppercase text-foreground">
            스크린샷 보고 일괄 등록
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            은행 앱 캡쳐를 올리면 자동으로 거래 내역을 인식합니다. 인식 결과를 확인 후 저장하세요.
          </p>
          {ocrStatus && (
            <div className={cn(
              "mt-2 rounded-lg px-3 py-2 text-xs font-medium",
              ocrLoading ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"
            )}>
              {ocrLoading && <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
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
                {bulkRows.map((row, index) => (
                  <Card key={index} className="border-0 bg-secondary p-3">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      <Input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateBulkRow(index, "date", e.target.value)}
                        className="text-xs"
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
                        onChange={(e) => updateBulkRow(index, "amount", e.target.value)}
                        className="text-xs"
                        placeholder="금액"
                        min={0}
                      />
                      <Input
                        value={row.description}
                        onChange={(e) => updateBulkRow(index, "description", e.target.value)}
                        className="text-xs"
                        placeholder="내용 (예: 3월 회비)"
                      />
                      <NativeSelect
                        value={row.memberName}
                        onChange={(e) => updateBulkRow(index, "memberName", e.target.value)}
                        className="text-xs"
                      >
                        <option value="">입금자/지출자</option>
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
                ))}
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
                {value === "ALL" ? "전체" : value === "INCOME" ? "수입" : "지출"}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {filteredRecords.map((record) => (
            <Card
              key={record.id}
              className="flex flex-wrap items-center justify-between gap-3 border-0 bg-secondary px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {record.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {record.recordedAt}
                  {record.memberName ? ` · ${record.memberName}` : ""}
                  {record.method ? ` · ${record.method}` : ""}
                </p>
              </div>
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
            </Card>
          ))}
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
