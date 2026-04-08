"use client";

import React, { useState, useMemo, useCallback } from "react";
import { GA } from "@/lib/analytics";
import { EmptyState } from "@/components/EmptyState";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Receipt, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { isStaffOrAbove } from "@/lib/permissions";
import { apiMutate } from "@/lib/useApi";
import { useConfirm } from "@/lib/ConfirmContext";
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
  autoMatchMember,
  summaryBalance,
}: DuesRecordsTabProps) {
  const confirm = useConfirm();
  /* ── 탭 전용 state ── */
  const [filter, setFilter] = useState<RecordFilter>("ALL");
  const [memberFilter, setMemberFilter] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<"INCOME" | "EXPENSE">("INCOME");
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
    const affectBalance = formData.get("affectBalance") === "on";
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
      const { data, error } = await apiMutate<{ duplicate?: boolean }>("/api/dues", "POST", {
        type,
        amount,
        description,
        userId,
        recordedAt: recordedAt || undefined,
        recordedTime: String(formData.get("recordedTime") || ""),
      });
      if (!error && !data?.duplicate) {
        if (affectBalance && summaryBalance !== null) {
          const diff = type === "INCOME" ? amount : -amount;
          await apiMutate("/api/dues/balance", "POST", { balance: summaryBalance + diff });
        }
        GA.duesRecordAdd("manual");
        await refetchSummary();
        await syncPaymentStatus();
        setIsFormOpen(false);
        setFormErrors({});
      }
    } finally {
      setSaving(false);
    }
  }, [autoMatchMember, refetchSummary, syncPaymentStatus, summaryBalance]);

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

  const handleDeleteRecord = useCallback(async (id: string, revertBalance = false) => {
    const record = monthRecords.find((r) => r.id === id);
    const { error } = await apiMutate(`/api/dues?id=${id}`, "DELETE");
    if (!error) {
      if (revertBalance && record && summaryBalance !== null) {
        const diff = record.type === "INCOME" ? -record.amount : record.amount;
        await apiMutate("/api/dues/balance", "POST", { balance: summaryBalance + diff });
      }
      await refetchSummary();
    }
  }, [monthRecords, summaryBalance, refetchSummary]);

  const [y, m] = monthFilter.split("-").map(Number);

  return (
    <div role="tabpanel" id="tabpanel-records" aria-labelledby="tab-records" className="space-y-4">
      {/* ── 헤더: 월 네비게이션 (중앙) + 필터 ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            aria-label="이전 달"
            onClick={() => {
              const prev = new Date(y, m - 2);
              setMonthFilter(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors active:scale-[0.97]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[3rem] text-center text-sm font-semibold text-foreground">
            {m}월
          </span>
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => {
              const next = new Date(y, m);
              setMonthFilter(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors active:scale-[0.97]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={memberFilter}
            onChange={(event) => setMemberFilter(event.target.value)}
            placeholder="이름 검색"
            list="dues-member-names"
            autoComplete="off"
            className="h-8 text-xs bg-card border-white/[0.06] flex-1"
          />
          <datalist id="dues-member-names">
            {members.map((mbr) => <option key={mbr.id} value={mbr.name} />)}
          </datalist>
          <NativeSelect
            value={filter}
            onChange={(e) => setFilter(e.target.value as RecordFilter)}
            className="h-8 w-20 bg-card border-white/[0.06] text-xs"
          >
            <option value="ALL">전체</option>
            <option value="INCOME">입금</option>
            <option value="EXPENSE">출금</option>
          </NativeSelect>
        </div>
      </div>

      {/* ── 수기 입력 폼 (Collapsible, staff only) ── */}
      {isStaffOrAbove(role) && (
        <div>
          <button
            type="button"
            onClick={() => { setIsFormOpen((prev) => { if (!prev) setFormErrors({}); return !prev; }); }}
            className="w-full flex items-center justify-between rounded-xl bg-card border border-white/[0.04] px-4 py-3 hover:bg-secondary/50 transition-colors active:scale-[0.99]"
          >
            <span className="text-sm font-medium text-foreground">수기 입력</span>
            {isFormOpen ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {isFormOpen && (
            <Card className="border-white/[0.04] bg-card mt-2 border-t-0 rounded-t-none">
              <CardContent className="space-y-3 px-4 py-3">
                <form
                  className="space-y-3"
                  action={(formData) => handleAddRecord(formData)}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">유형</Label>
                      <NativeSelect
                        name="type"
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as "INCOME" | "EXPENSE")}
                        className="h-10 rounded-lg bg-secondary border-0"
                      >
                        <option value="INCOME">입금</option>
                        <option value="EXPENSE">출금</option>
                      </NativeSelect>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">금액</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₩</span>
                        <Input
                          name="amount"
                          type="number"
                          min={0}
                          required
                          placeholder="30,000"
                          className={cn(
                            "h-10 rounded-lg bg-secondary border-0 pl-7 text-right",
                            formErrors.amount && "border border-destructive"
                          )}
                          onChange={() => setFormErrors((prev) => ({ ...prev, amount: "" }))}
                        />
                      </div>
                      {formErrors.amount && <p className="text-xs text-destructive">{formErrors.amount}</p>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">내용</Label>
                    <Input
                      name="description"
                      required
                      placeholder="예: 4월 회비, 구장 대여비"
                      className="h-10 rounded-lg bg-secondary border-0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">날짜</Label>
                      <Input
                        name="recordedAt"
                        type="date"
                        required
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        className={cn(
                          "h-10 rounded-lg bg-secondary border-0",
                          formErrors.recordedAt && "border border-destructive"
                        )}
                        onChange={() => setFormErrors((prev) => ({ ...prev, recordedAt: "" }))}
                      />
                      {formErrors.recordedAt && <p className="text-xs text-destructive">{formErrors.recordedAt}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">시간</Label>
                      <Input
                        name="recordedTime"
                        type="time"
                        defaultValue={`${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`}
                        className="h-10 rounded-lg bg-secondary border-0"
                      />
                    </div>
                  </div>

                  {formType === "EXPENSE" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">결제 수단</Label>
                        <NativeSelect
                          name="method"
                          className="h-10 rounded-lg bg-secondary border-0"
                        >
                          <option value="계좌이체">계좌이체</option>
                          <option value="카드">카드</option>
                          <option value="현금">현금</option>
                        </NativeSelect>
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="submit"
                          className="w-full h-10 rounded-lg active:scale-[0.97] transition-transform"
                          disabled={saving}
                        >
                          {saving ? "저장 중..." : "저장"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="submit"
                      className="w-full h-10 rounded-lg active:scale-[0.97] transition-transform"
                      disabled={saving}
                    >
                      {saving ? "저장 중..." : "저장"}
                    </Button>
                  )}

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="affectBalance" className="h-4 w-4 rounded border-border accent-primary" />
                      <span className="text-[11px] text-muted-foreground">잔고에 반영</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      이름 포함 시 납부 자동 연결
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── 거래 내역 목록 ── */}
      {filteredRecords.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="아직 거래 내역이 없습니다"
          description="위에서 수기 입력하거나, 내역 올리기 탭에서 스크린샷/엑셀을 올려보세요."
        />
      ) : (
        <div className="space-y-2">
          {filteredRecords.map((record) =>
            editingRecord?.id === record.id ? (
              <Card key={record.id} data-edit-id={record.id} className="border-primary/30 bg-card py-2">
                <CardContent className="px-4 pb-0">
                  <form className="space-y-3" action={(fd) => handleUpdateRecord(fd)}>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">유형</Label>
                        <NativeSelect name="editType" defaultValue={record.type} className="h-10 rounded-lg bg-secondary border-0">
                          <option value="INCOME">입금</option>
                          <option value="EXPENSE">출금</option>
                        </NativeSelect>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">금액</Label>
                        <Input name="editAmount" type="number" defaultValue={record.amount} min={0} required placeholder="금액" className="h-10 rounded-lg bg-secondary border-0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">날짜</Label>
                        <Input name="editDate" type="date" defaultValue={(() => { const d = new Date(record.recordedAt); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()} className="h-10 rounded-lg bg-secondary border-0" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">시간</Label>
                        <Input name="editTime" type="time" defaultValue={(() => { const d = new Date(record.recordedAt); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; })()} className="h-10 rounded-lg bg-secondary border-0" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">내용</Label>
                      <Input name="editDescription" defaultValue={record.description} required placeholder="내용" className="h-10 rounded-lg bg-secondary border-0" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingRecord(null)}>취소</Button>
                      <Button type="submit" size="sm">저장</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card
                key={record.id}
                className="border-white/[0.04] bg-card py-2 hover:bg-secondary/50 transition-colors"
              >
                <CardContent className="px-4 pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground line-clamp-2 break-all">
                        {record.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(() => { const d = new Date(record.recordedAt); const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000); const [, mm, dd] = kst.toISOString().slice(0, 10).split("-"); return `${Number(mm)}월 ${Number(dd)}일`; })()}
                        {record.memberName ? (
                          <> · <span className="font-semibold text-foreground/80">{record.memberName}</span></>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={record.type === "INCOME" ? "success" : "destructive"}
                          className="border-0 text-[10px] px-1.5 py-0"
                        >
                          {record.type === "INCOME" ? "입금" : "출금"}
                        </Badge>
                        <span
                          className={cn(
                            "text-sm font-bold whitespace-nowrap tabular-nums",
                            record.type === "INCOME"
                              ? "text-[hsl(var(--success))]"
                              : "text-[hsl(var(--loss))]"
                          )}
                        >
                          {record.type === "INCOME" ? "+" : "-"}
                          {record.amount.toLocaleString()}원
                        </span>
                      </div>
                      {isStaffOrAbove(role) && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRecord(record);
                              setIsFormOpen(false);
                              setTimeout(() => {
                                document.querySelector(`[data-edit-id="${record.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                              }, 100);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors active:scale-95"
                            aria-label="수정"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await confirm({ title: "이 내역을 삭제하시겠습니까?", description: "잔고에도 반영된 내역이라면 잔고가 함께 조정됩니다.", variant: "destructive", confirmLabel: "삭제 (잔고 복원)", cancelLabel: "취소" });
                              if (ok) handleDeleteRecord(record.id, true);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-95"
                            aria-label="삭제"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}

export const DuesRecordsTab = React.memo(DuesRecordsTabInner);
