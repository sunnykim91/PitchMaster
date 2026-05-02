"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, X, UserX, Wallet } from "lucide-react";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { isStaffOrAbove } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { apiMutate } from "@/lib/useApi";
import { useConfirm } from "@/lib/ConfirmContext";
import { formatAmount } from "@/lib/formatters";
import type { Role } from "@/lib/types";

/* ── 타입 정의 ── */

type DuesSetting = {
  id: string;
  memberType: string;
  monthlyAmount: number;
  description: string;
};

type ApiMember = { id: string; name: string; memberId: string; role: string };

export type DuesSettingsTabProps = {
  role: Role | undefined;
  monthFilter: string;
  settings: DuesSetting[];
  periodConfig: { id?: string; startDay: number };
  getDuesPeriod: (month: string, startDay: number) => { from: string; to: string };
  refetchSummary: () => Promise<void>;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  members?: ApiMember[];
  refetchPaymentStatus?: () => Promise<unknown>;
};

function DuesSettingsTabInner({
  role,
  monthFilter,
  settings,
  periodConfig,
  getDuesPeriod,
  refetchSummary,
  showToast,
  members,
  refetchPaymentStatus,
}: DuesSettingsTabProps) {
  const confirm = useConfirm();
  /* ── 탭 전용 state ── */
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [savingSetting, setSavingSetting] = useState(false);
  const [editingSetting, setEditingSetting] = useState<DuesSetting | null>(null);
  const [settingFormState, setSettingFormState] = useState({ memberType: "", monthlyAmount: "", description: "" });

  /* ── 금액 인라인 편집 state ── */
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [editingAmountValue, setEditingAmountValue] = useState("");

  /* (회원별 회비 유형 배정은 추후 구현) */

  /* ── 신규 회비 유형 추가 폼 state ── */
  const [newMemberType, setNewMemberType] = useState("");
  const [newMonthlyAmount, setNewMonthlyAmount] = useState("");

  async function handleAddSetting(formData: FormData) {
    const memberType = String(formData.get("memberType"));
    const monthlyAmount = Number(formData.get("monthlyAmount"));
    const description = String(formData.get("description") || "");

    if (!memberType) { showToast("회원 유형을 입력해주세요.", "error"); return; }
    if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
      showToast("월 회비는 0보다 큰 숫자여야 합니다.", "error");
      return;
    }

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
        setNewMemberType("");
        setNewMonthlyAmount("");
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

  /* ── 금액 인라인 편집 핸들러 ── */
  function handleStartEditAmount(setting: DuesSetting) {
    setEditingAmountId(setting.id);
    setEditingAmountValue(String(setting.monthlyAmount));
  }

  async function handleFinishEditAmount(setting: DuesSetting) {
    const newAmount = Number(editingAmountValue.replace(/\D/g, "")) || 0;
    if (newAmount > 0 && newAmount !== setting.monthlyAmount) {
      const { error } = await apiMutate("/api/dues-settings", "PUT", {
        id: setting.id,
        memberType: setting.memberType,
        monthlyAmount: newAmount,
        description: setting.description,
      });
      if (error) {
        showToast(error, "error");
      } else {
        showToast("회비 기준이 수정되었습니다.");
        await refetchSummary();
      }
    }
    setEditingAmountId(null);
    setEditingAmountValue("");
  }

  /* ── 납부 기준일 변경 ── */
  async function handleStartDayChange(val: number) {
    if (val === periodConfig.startDay) return;
    if (periodConfig.id) {
      await apiMutate("/api/dues-settings", "PUT", {
        id: periodConfig.id,
        memberType: "__PERIOD__",
        monthlyAmount: val,
        description: "납부 기준일",
      });
    } else {
      await apiMutate("/api/dues-settings", "POST", {
        memberType: "__PERIOD__",
        monthlyAmount: val,
        description: "납부 기준일",
      });
    }
    await refetchSummary();
    showToast(`납부 기준일: 매월 ${val}일로 설정됨`, "success");
  }


  return (
    <div role="tabpanel" id="tabpanel-settings" aria-labelledby="tab-settings" className="space-y-4">
      <h2 className="text-sm font-medium text-foreground">회비 설정</h2>

      {/* ── 납부 기준일 설정 ── */}
      {isStaffOrAbove(role) && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">납부 기준일</Label>
          <NativeSelect
            className="w-full h-12 rounded-xl bg-secondary border-0"
            value={String(periodConfig.startDay)}
            onChange={(e) => handleStartDayChange(Number(e.target.value))}
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={String(day)}>
                매월 {day}일
              </option>
            ))}
          </NativeSelect>
          {periodConfig.startDay > 1 && (() => {
            const { from, to } = getDuesPeriod(monthFilter, periodConfig.startDay);
            return (
              <p className="text-xs text-primary">
                {monthFilter.replace("-", "년 ")}월 회비 기간: {from} ~ {to}
              </p>
            );
          })()}
        </div>
      )}

      {/* ── 회비 기준 ── */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">회비 기준</p>

        {settings.length > 0 && (
          <Card className="border-white/[0.06] bg-card py-0 divide-y divide-white/5">
            {settings.map((setting) =>
              editingSetting?.id === setting.id ? (
                /* 전체 행 편집 모드 */
                <div key={setting.id} className="px-4 py-3">
                  <form onSubmit={handleUpdateSetting} className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">유형명</Label>
                        <Input
                          value={settingFormState.memberType}
                          onChange={(e) => setSettingFormState((prev) => ({ ...prev, memberType: e.target.value }))}
                          required
                          className="h-10 rounded-lg bg-secondary border-0 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">금액</Label>
                        <Input
                          type="number"
                          min={0}
                          value={settingFormState.monthlyAmount}
                          onChange={(e) => setSettingFormState((prev) => ({ ...prev, monthlyAmount: e.target.value }))}
                          required
                          className="h-10 rounded-lg bg-secondary border-0 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">설명</Label>
                      <Input
                        value={settingFormState.description}
                        onChange={(e) => setSettingFormState((prev) => ({ ...prev, description: e.target.value }))}
                        className="h-10 rounded-lg bg-secondary border-0 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-10 active:scale-[0.97] transition-transform"
                        type="button"
                        onClick={handleCancelEditSetting}
                      >
                        취소
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-10 active:scale-[0.97] transition-transform"
                        type="submit"
                      >
                        저장
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                /* 일반 행 */
                <div
                  key={setting.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() => handleEditSetting(setting)}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left min-w-0 flex-1 truncate"
                    title={setting.description ? `${setting.memberType} (${setting.description})` : setting.memberType}
                  >
                    {setting.memberType}
                    {setting.description ? (
                      <span className="ml-1 text-xs text-muted-foreground">({setting.description})</span>
                    ) : null}
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    {editingAmountId === setting.id ? (
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={editingAmountValue}
                        onChange={(e) => setEditingAmountValue(e.target.value)}
                        onBlur={() => handleFinishEditAmount(setting)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleFinishEditAmount(setting);
                          if (e.key === "Escape") { setEditingAmountId(null); setEditingAmountValue(""); }
                        }}
                        className="h-8 w-28 bg-secondary border-0 text-right font-semibold text-sm rounded-lg pr-1"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartEditAmount(setting)}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {formatAmount(setting.monthlyAmount)}
                      </button>
                    )}
                    {isStaffOrAbove(role) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        type="button"
                        onClick={async () => {
                          const ok = await confirm({ title: "이 회비 기준을 삭제할까요?", variant: "destructive", confirmLabel: "삭제" });
                          if (ok) handleDeleteSetting(setting.id);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            )}
          </Card>
        )}

        {settings.length === 0 && !isSettingOpen && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-muted-foreground">아직 회비 기준이 없습니다. 아래에서 추가해주세요.</p>
          </div>
        )}

        {/* 회비 유형 추가 폼 / 버튼 */}
        {isStaffOrAbove(role) && (
          isSettingOpen ? (
            <Card className="border-white/[0.06] bg-card py-4">
              <div className="px-4 space-y-3">
                <form
                  action={(formData) => {
                    formData.set("memberType", newMemberType);
                    formData.set("monthlyAmount", newMonthlyAmount.replace(/\D/g, ""));
                    handleAddSetting(formData);
                  }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">유형명</Label>
                      <Input
                        name="memberType"
                        placeholder="예: 신입"
                        value={newMemberType}
                        onChange={(e) => setNewMemberType(e.target.value)}
                        className="h-12 rounded-xl bg-secondary border-0"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">금액</Label>
                      <Input
                        name="monthlyAmount"
                        type="text"
                        inputMode="numeric"
                        placeholder="30,000"
                        value={newMonthlyAmount}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          setNewMonthlyAmount(digits ? new Intl.NumberFormat("ko-KR").format(Number(digits)) : "");
                        }}
                        className="h-12 rounded-xl bg-secondary border-0"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">설명 (선택)</Label>
                    <Input
                      name="description"
                      placeholder="예: 학생 할인 적용"
                      className="h-12 rounded-xl bg-secondary border-0"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10 active:scale-[0.97] transition-transform"
                      type="button"
                      onClick={() => { setIsSettingOpen(false); setNewMemberType(""); setNewMonthlyAmount(""); }}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-10 active:scale-[0.97] transition-transform"
                      type="submit"
                      disabled={savingSetting || !newMemberType || !newMonthlyAmount}
                    >
                      {savingSetting ? "추가 중..." : "추가"}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2 h-11 active:scale-[0.97] transition-transform"
              type="button"
              onClick={() => setIsSettingOpen(true)}
            >
              <Plus className="h-4 w-4" />
              회비 유형 추가
            </Button>
          )
        )}
      </div>

      {/* 회비 유형은 개별 추가/수정/삭제 시 즉시 서버에 반영되므로 별도 저장 버튼 불필요 */}

      {/* ── 벌금 규칙 설정 ── */}
      <PenaltyRulesSection refetchSummary={refetchSummary} />

      {/* ── 회원 회비 면제 관리 ── */}
      <MemberExemptionSection members={members ?? []} refetchPaymentStatus={refetchPaymentStatus} settings={settings} />
    </div>
  );
}

// ── 휴회비 설정 ──
function LeaveDuesSetting({ refetchSummary }: { refetchSummary: () => Promise<void> }) {
  const [amount, setAmount] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [settingId, setSettingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    fetch("/api/dues-settings")
      .then((r) => r.json())
      .then((data) => {
        const leaveRow = (data.settings ?? []).find((s: { member_type: string }) => s.member_type === "__LEAVE__");
        if (leaveRow) {
          setAmount(String(leaveRow.monthly_amount));
          setSettingId(leaveRow.id);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function handleSave() {
    const numAmount = Number(amount.replace(/\D/g, "")) || 0;
    setSaving(true);

    if (settingId) {
      await apiMutate("/api/dues-settings", "PUT", { id: settingId, monthlyAmount: numAmount });
    } else if (numAmount > 0) {
      const { data } = await apiMutate("/api/dues-settings", "POST", { memberType: "__LEAVE__", monthlyAmount: numAmount, description: "휴회비" });
      if (data && typeof data === "object" && "id" in data) setSettingId((data as { id: string }).id);
    }

    setSaving(false);
    await refetchSummary();
  }

  if (!loaded) return null;

  return (
    <div className="mt-6 space-y-2">
      <h3 className="text-sm font-bold text-foreground">휴회비</h3>
      <p className="text-xs text-muted-foreground">휴회 중인 회원에게 적용되는 금액입니다. 0원이면 회비 면제.</p>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="10,000"
          value={amount ? new Intl.NumberFormat("ko-KR").format(Number(amount.replace(/\D/g, ""))) : ""}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          className="h-10 w-32 text-sm"
        />
        <span className="text-sm text-muted-foreground">원</span>
        <Button size="sm" className="h-10" disabled={saving} onClick={handleSave}>
          {saving ? "저장 중..." : settingId ? "수정" : "설정"}
        </Button>
      </div>
    </div>
  );
}

// ── 벌금 규칙 관리 ──
function PenaltyRulesSection({ refetchSummary }: { refetchSummary: () => Promise<void> }) {
  const [rules, setRules] = useState<{ id: string; name: string; trigger_type: string; amount: number; is_active: boolean }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const confirm = useConfirm();

  // 규칙 로드
  React.useEffect(() => {
    fetch("/api/dues/penalty-rules")
      .then((r) => r.json())
      .then((data) => { if (data.rules) setRules(data.rules); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  async function handleAdd(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    const triggerType = String(formData.get("triggerType") || "CUSTOM");
    const amount = Number(formData.get("amount") || 0);
    if (!name || amount <= 0) return;

    const { data } = await apiMutate("/api/dues/penalty-rules", "POST", { name, triggerType, amount });
    if (data) {
      setRules((prev) => [...prev, data as typeof prev[0]]);
      setAdding(false);
      await refetchSummary();
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ title: "벌금 규칙을 삭제할까요?", variant: "destructive", confirmLabel: "삭제" });
    if (!ok) return;
    await apiMutate("/api/dues/penalty-rules", "DELETE", { id });
    setRules((prev) => prev.filter((r) => r.id !== id));
    await refetchSummary();
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    const { error } = await apiMutate("/api/dues/penalty-rules", "PUT", { id, isActive: !currentActive });
    if (!error) {
      setRules((prev) => prev.map((r) => r.id === id ? { ...r, is_active: !currentActive } : r));
    }
  }

  if (!loaded) return null;

  const TRIGGER_LABELS: Record<string, string> = {
    LATE: "지각",
    ABSENT: "불참",
    NO_VOTE: "미투표",
    CUSTOM: "기타",
  };

  return (
    <div className="mt-8 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">벌금 규칙</h3>
          <p className="text-xs text-muted-foreground">경기 완료 시 자동으로 벌금이 부과됩니다</p>
        </div>
        {!adding && (
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> 추가
          </Button>
        )}
      </div>

      {/* 규칙 목록 */}
      {rules.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground/60 py-4 text-center">등록된 벌금 규칙이 없습니다</p>
      )}

      {rules.map((rule) => (
        <Card key={rule.id} className={cn("border-white/[0.04] bg-card p-3", !rule.is_active && "opacity-50")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleActive(rule.id, rule.is_active)}
                className={cn(
                  "h-5 w-9 rounded-full transition-colors relative shrink-0",
                  rule.is_active ? "bg-[hsl(var(--success))]" : "bg-muted"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                  rule.is_active ? "left-[1.1rem]" : "left-0.5"
                )} />
              </button>
              <div>
                <span className="text-sm font-semibold">{rule.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">({TRIGGER_LABELS[rule.trigger_type] || rule.trigger_type})</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary">{formatAmount(rule.amount)}</span>
              <button type="button" onClick={() => handleDelete(rule.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>
      ))}

      {/* 추가 폼 */}
      {adding && (
        <Card className="border-primary/20 bg-card p-3">
          <form action={handleAdd} className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">규칙 이름</Label>
                <Input name="name" required placeholder="예: 지각비" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">트리거</Label>
                <NativeSelect name="triggerType" className="h-9 text-sm">
                  <option value="LATE">지각</option>
                  <option value="ABSENT">불참</option>
                  <option value="NO_VOTE">미투표</option>
                  <option value="CUSTOM">기타</option>
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">금액</Label>
                <Input name="amount" type="number" min={0} required placeholder="5000" className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>취소</Button>
              <Button type="submit" size="sm">저장</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

// ── 회원 회비 상태 관리 (면제/선납/휴회/부상) ──
const EXEMPTION_TYPES = [
  { value: "EXEMPT", label: "면제", color: "text-[hsl(var(--warning))]" },
  { value: "PREPAID", label: "선납", color: "text-[hsl(var(--success))]" },
  { value: "LEAVE", label: "휴회", color: "text-[hsl(var(--info))]" },
  { value: "INJURED", label: "부상", color: "text-destructive" },
] as const;

type ExemptionType = "EXEMPT" | "PREPAID" | "LEAVE" | "INJURED";

const PREPAID_PERIOD_OPTIONS = [3, 6, 12] as const;

type Exemption = {
  id: string;
  member_id: string;
  exemption_type: string;
  reason: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  monthly_amount: number | null;
  period_months: number | null;
  actual_paid_amount: number | null;
};

function nextMonthFirstISO(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
}

function computePrepaidEndDate(startMonth: string, periodMonths: number): string {
  if (!/^\d{4}-\d{2}-01$/.test(startMonth)) return "";
  const [y, m] = startMonth.slice(0, 7).split("-").map(Number);
  const endMonthIdx = m - 1 + periodMonths - 1;
  const carryYear = y + Math.floor(endMonthIdx / 12);
  const carryMonth = ((endMonthIdx % 12) + 12) % 12;
  const last = new Date(carryYear, carryMonth + 1, 0);
  const yyyy = last.getFullYear();
  const mm = String(last.getMonth() + 1).padStart(2, "0");
  const dd = String(last.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function MemberExemptionSection({
  members,
  refetchPaymentStatus,
  settings,
}: {
  members: ApiMember[];
  refetchPaymentStatus?: () => Promise<unknown>;
  settings: DuesSetting[];
}) {
  const [exemptions, setExemptions] = useState<Exemption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [runAction, actionLoading] = useAsyncAction();
  const confirm = useConfirm();

  // 폼 상태
  const defaultMonthlyAmount = settings[0]?.monthlyAmount ?? 30000;
  const [memberId, setMemberId] = useState("");
  const [exemptionType, setExemptionType] = useState<ExemptionType>("EXEMPT");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  // PREPAID 전용
  const [periodMonths, setPeriodMonths] = useState<3 | 6 | 12>(6);
  const [startMonth, setStartMonth] = useState(nextMonthFirstISO());
  const [monthlyAmount, setMonthlyAmount] = useState<number>(defaultMonthlyAmount);
  const [actualPaidAmount, setActualPaidAmount] = useState<number>(defaultMonthlyAmount * 6);

  function resetForm() {
    setMemberId("");
    setExemptionType("EXEMPT");
    setReason("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setPeriodMonths(6);
    setStartMonth(nextMonthFirstISO());
    setMonthlyAmount(defaultMonthlyAmount);
    setActualPaidAmount(defaultMonthlyAmount * 6);
  }

  React.useEffect(() => {
    fetch("/api/dues/member-status")
      .then((r) => r.json())
      .then((data) => { if (data.exemptions) setExemptions(data.exemptions); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  async function handleAdd() {
    if (!memberId) return;

    let payload: Record<string, unknown>;
    if (exemptionType === "PREPAID") {
      if (!/^\d{4}-\d{2}-01$/.test(startMonth) || monthlyAmount <= 0 || actualPaidAmount <= 0) return;
      payload = {
        memberId,
        exemptionType,
        reason: reason.trim() || null,
        startDate: startMonth,
        endDate: computePrepaidEndDate(startMonth, periodMonths),
        monthlyAmount,
        periodMonths,
        actualPaidAmount,
      };
    } else {
      if (!startDate) return;
      payload = {
        memberId,
        exemptionType,
        reason: reason.trim() || null,
        startDate,
        endDate: endDate || null,
      };
    }

    await runAction(async () => {
      const { data } = await apiMutate("/api/dues/member-status", "POST", payload);
      if (data) {
        setExemptions((prev) => [data as Exemption, ...prev]);
        setAdding(false);
        resetForm();
        refetchPaymentStatus?.();
      }
    });
  }

  async function handleEnd(id: string) {
    const ok = await confirm({ title: "이 상태를 종료할까요?", confirmLabel: "종료" });
    if (!ok) return;
    await runAction(async () => {
      await apiMutate("/api/dues/member-status", "PUT", { id });
      setExemptions((prev) => prev.map((e) => e.id === id ? { ...e, is_active: false, end_date: new Date().toISOString().slice(0, 10) } : e));
      refetchPaymentStatus?.();
    });
  }

  const activeExemptions = exemptions.filter((e) => e.is_active);
  const historyExemptions = exemptions.filter((e) => !e.is_active);
  const [showHistory, setShowHistory] = useState(false);

  function getMemberName(mid: string): string {
    return members.find((m) => m.memberId === mid || m.id === mid)?.name ?? "알 수 없음";
  }

  function getTypeInfo(type: string) {
    return EXEMPTION_TYPES.find((t) => t.value === type) ?? EXEMPTION_TYPES[0];
  }

  if (!loaded) return null;

  const isPrepaidForm = exemptionType === "PREPAID";
  const prepaidTotal = monthlyAmount * periodMonths;
  const prepaidDiscount = prepaidTotal - actualPaidAmount;
  const prepaidEndDate = computePrepaidEndDate(startMonth, periodMonths);

  return (
    <div className="mt-8 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">회원 회비 상태</h3>
          <p className="text-xs text-muted-foreground">면제·선납·휴회·부상 설정 시 매월 자동 면제 처리</p>
        </div>
        {!adding && (
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> 추가
          </Button>
        )}
      </div>

      {/* 추가 폼 */}
      {adding && (
        <Card className="border-primary/20 bg-card p-3">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">회원</Label>
                <NativeSelect value={memberId} onChange={(e) => setMemberId(e.target.value)} className="h-9 text-sm">
                  <option value="">선택</option>
                  {members.map((m) => <option key={m.memberId} value={m.memberId}>{m.name}</option>)}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">상태</Label>
                <NativeSelect
                  value={exemptionType}
                  onChange={(e) => {
                    const v = e.target.value as ExemptionType;
                    setExemptionType(v);
                    if (v === "PREPAID") setActualPaidAmount(monthlyAmount * periodMonths);
                  }}
                  className="h-9 text-sm"
                >
                  {EXEMPTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </NativeSelect>
              </div>
            </div>

            {isPrepaidForm ? (
              <>
                {/* 기간 */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">기간</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PREPAID_PERIOD_OPTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPeriodMonths(p);
                          setActualPaidAmount(monthlyAmount * p);
                        }}
                        className={cn(
                          "h-9 rounded-lg border text-sm font-medium transition-colors",
                          periodMonths === p
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-foreground hover:bg-secondary"
                        )}
                      >
                        {p}개월
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">월 회비</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={monthlyAmount || ""}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        setMonthlyAmount(v);
                        setActualPaidAmount(v * periodMonths);
                      }}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">시작월</Label>
                    <Input
                      type="month"
                      value={startMonth.slice(0, 7)}
                      onChange={(e) => {
                        if (/^\d{4}-\d{2}$/.test(e.target.value)) setStartMonth(`${e.target.value}-01`);
                      }}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* 미리보기 박스 */}
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">합계</span>
                    <span className="font-medium tabular-nums">{formatAmount(prepaidTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">받은 금액</span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={actualPaidAmount || ""}
                      onChange={(e) => setActualPaidAmount(Number(e.target.value) || 0)}
                      className="h-8 w-32 text-right text-sm font-bold text-primary"
                    />
                  </div>
                  {prepaidDiscount > 0 && actualPaidAmount > 0 && (
                    <div className="flex items-center justify-end text-xs text-[hsl(var(--success))] font-medium">
                      {formatAmount(prepaidDiscount)} 우대
                    </div>
                  )}
                  {prepaidEndDate && (
                    <div className="text-[11px] text-muted-foreground/70 pt-1">
                      {startMonth.slice(0, 7)} ~ {prepaidEndDate.slice(0, 7)}
                    </div>
                  )}
                </div>

                {/* 입금 안내 + 버튼 */}
                <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    💡 받은 <b>{formatAmount(actualPaidAmount)}</b>은 회비 기록에 입금 1건으로 남겨주세요. OCR·엑셀·수기 모두 가능합니다.
                  </div>
                  <Link
                    href="/dues?tab=records"
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    입금 등록하러 가기
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">사유</Label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="예: 임원, 키퍼, 무릎 부상, 해외 출장"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">시작일</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">종료일 (미정이면 비움)</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setAdding(false); resetForm(); }}>취소</Button>
              <Button type="button" size="sm" disabled={actionLoading} onClick={handleAdd}>{actionLoading ? "등록 중..." : "등록"}</Button>
            </div>
          </div>
        </Card>
      )}

      {/* 활성 목록 */}
      {activeExemptions.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground/60 py-4 text-center">등록된 면제·선납·휴회·부상 회원이 없습니다</p>
      )}

      {activeExemptions.map((ex) => {
        const typeInfo = getTypeInfo(ex.exemption_type);
        const isPrepaid = ex.exemption_type === "PREPAID";
        return (
          <Card key={ex.id} className="border-white/[0.04] bg-card p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{getMemberName(ex.member_id)}</span>
                  <span className={`text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                  {isPrepaid && ex.period_months && (
                    <span className="text-[10px] text-muted-foreground">({ex.period_months}개월)</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground flex-wrap">
                  <span>{ex.start_date} ~</span>
                  <span>{ex.end_date ?? "무기한"}</span>
                  {isPrepaid && ex.actual_paid_amount != null && (
                    <span className="text-[hsl(var(--success))] font-medium">· {formatAmount(ex.actual_paid_amount)}</span>
                  )}
                  {ex.reason && <span>· {ex.reason}</span>}
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs shrink-0" disabled={actionLoading} onClick={() => handleEnd(ex.id)}>
                종료
              </Button>
            </div>
          </Card>
        );
      })}

      {/* 이력 */}
      {historyExemptions.length > 0 && (
        <button
          type="button"
          onClick={() => setShowHistory((p) => !p)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          지난 이력 ({historyExemptions.length}건) {showHistory ? "접기" : "보기"}
        </button>
      )}
      {showHistory && historyExemptions.map((ex) => {
        const typeInfo = getTypeInfo(ex.exemption_type);
        return (
          <Card key={ex.id} className="border-white/[0.04] bg-card/50 p-3 opacity-60">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium">{getMemberName(ex.member_id)}</span>
              <span className={`text-[10px] ${typeInfo.color}`}>{typeInfo.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {ex.start_date} ~ {ex.end_date ?? "무기한"}
                {ex.reason && ` · ${ex.reason}`}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export const DuesSettingsTab = React.memo(DuesSettingsTabInner);
