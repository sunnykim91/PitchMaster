"use client";

import React, { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { isStaffOrAbove } from "@/lib/permissions";
import { apiMutate } from "@/lib/useApi";
import type { Role } from "@/lib/types";

/* ── 타입 정의 ── */

type DuesRecord = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  recordedAt: string;
  memberName?: string;
  method?: string;
};

type RecordFilter = "ALL" | "INCOME" | "EXPENSE";

type ApiMember = {
  id: string;
  name: string;
  memberId: string;
  role: string;
};

export type DuesRecordsTabProps = {
  role: Role | undefined;
  monthFilter: string;
  setMonthFilter: (v: string) => void;
  monthRecords: DuesRecord[];
  members: ApiMember[];
  refetchSummary: () => Promise<void>;
  syncPaymentStatus: () => Promise<void>;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  setConfirmAction: (v: { message: string; onConfirm: () => void; variant?: "default" | "destructive"; confirmLabel?: string } | null) => void;
  autoMatchMember: (description: string) => string | undefined;
  summaryBalance: number | null;
};

function DuesRecordsTabInner({
  role,
  monthFilter,
  setMonthFilter,
  monthRecords,
  members,
  refetchSummary,
  syncPaymentStatus,
  showToast,
  setConfirmAction,
  autoMatchMember,
  summaryBalance,
}: DuesRecordsTabProps) {
  /* ── 탭 전용 state ── */
  const [filter, setFilter] = useState<RecordFilter>("ALL");
  const [memberFilter, setMemberFilter] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DuesRecord | null>(null);

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

  const handleAddRecord = useCallback(async (formData: FormData) => {
    const type = String(formData.get("type"));
    const amount = Number(formData.get("amount"));
    const description = String(formData.get("description"));
    const recordedAt = String(formData.get("recordedAt") || "");
    const userId = autoMatchMember(description);

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
        recordedAt: recordedAt || undefined,
      });
      if (!error) {
        await refetchSummary();
        await syncPaymentStatus();
        setIsFormOpen(false);
        setFormErrors({});
      }
    } finally {
      setSaving(false);
    }
  }, [autoMatchMember, refetchSummary, syncPaymentStatus]);

  const handleUpdateRecord = useCallback(async (formData: FormData) => {
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
      if (diff !== 0 && summaryBalance !== null) {
        await apiMutate("/api/dues/balance", "POST", { balance: summaryBalance + diff });
      }
      await refetchSummary();
      setEditingRecord(null);
    }
  }, [editingRecord, autoMatchMember, summaryBalance, refetchSummary]);

  const handleDeleteRecord = useCallback(async (id: string) => {
    const record = monthRecords.find((r) => r.id === id);
    const { error } = await apiMutate(`/api/dues?id=${id}`, "DELETE");
    if (!error) {
      if (record && summaryBalance !== null) {
        const diff = record.type === "INCOME" ? -record.amount : record.amount;
        await apiMutate("/api/dues/balance", "POST", { balance: summaryBalance + diff });
      }
      await refetchSummary();
    }
  }, [monthRecords, summaryBalance, refetchSummary]);

  return (
    <div role="tabpanel" id="tabpanel-records" aria-labelledby="tab-records">
      {/* ── 입출금 기록 입력 (collapsible, staff only) ── */}
      {isStaffOrAbove(role) && (
        <div className="flex justify-end gap-2 mb-5">
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
        <Card className="p-4 sm:p-6 mb-5">
          <h3 className="font-heading text-base sm:text-lg font-bold uppercase text-foreground">
            입출금 기록 입력
          </h3>

          <form
            className="mt-4 grid gap-4"
            action={(formData) => handleAddRecord(formData)}
          >
            <Card className="border-0 bg-secondary p-3 sm:p-5">
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
                  <p className="text-xs text-muted-foreground">
                    내용에 팀원 이름이 포함되면 해당 팀원의 납부 기록으로 자동 연결됩니다.
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
            </Card>

            <Button type="submit" className="w-full" size="lg" disabled={saving}>
              {saving ? "저장 중..." : "저장하기"}
            </Button>
          </form>
        </Card>
      ) : null}

      {/* ── 입출금 내역 ── */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-lg sm:text-2xl font-bold uppercase text-foreground">
              입출금 내역
            </h3>
          </div>

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
              className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-40">
            <Input
              type="text"
              value={memberFilter}
              onChange={(event) => setMemberFilter(event.target.value)}
              placeholder="이름 검색"
              list="dues-member-names"
              autoComplete="off"
              className="text-xs"
            />
            <datalist id="dues-member-names">
              {members.map((m) => <option key={m.id} value={m.name} />)}
            </datalist>
          </div>
          <div className="flex gap-1.5">
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
                        className="min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors active:scale-95"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ message: "이 내역을 삭제하시겠습니까?", onConfirm: () => handleDeleteRecord(record.id) })}
                        className="min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium bg-[hsl(var(--loss)/0.15)] text-[hsl(var(--loss))] hover:bg-[hsl(var(--loss)/0.25)] transition-colors active:scale-95"
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
    </div>
  );
}

export const DuesRecordsTab = React.memo(DuesRecordsTabInner);
