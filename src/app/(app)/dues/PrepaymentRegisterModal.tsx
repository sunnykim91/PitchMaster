"use client";

import { useEffect, useMemo, useState } from "react";
import { X, CalendarDays, Wallet, ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { apiMutate } from "@/lib/useApi";
import { computeEndMonth, formatPrepaymentLabel } from "@/lib/duesPrepayment";
import { formatAmount } from "@/lib/formatters";

type Member = {
  id: string;       // users.id (or unlinked_xxx)
  memberId: string; // team_members.id
  name: string;
  role: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  members: Member[];
  /** 선택지로 보여줄 월 회비 금액 후보 (3·6·12개월 곱해 자동 채움) */
  monthlyAmountCandidates: number[];
  onSuccess: (msg: string) => void | Promise<void>;
  onError: (msg: string) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
};

const PERIOD_OPTIONS = [3, 6, 12] as const;

/** 다음 달 1일 YYYY-MM-DD */
function nextMonthFirst(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

export default function PrepaymentRegisterModal({
  open,
  onClose,
  members,
  monthlyAmountCandidates,
  onSuccess,
  onError,
}: Props) {
  const [memberId, setMemberId] = useState<string>("");
  const [periodMonths, setPeriodMonths] = useState<3 | 6 | 12>(6);
  const [startMonth, setStartMonth] = useState<string>(nextMonthFirst());
  const [monthlyAmount, setMonthlyAmount] = useState<number>(
    monthlyAmountCandidates[0] ?? 30000,
  );
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // 모달이 열릴 때 기본값 리셋
  useEffect(() => {
    if (!open) return;
    setMemberId("");
    setPeriodMonths(6);
    setStartMonth(nextMonthFirst());
    setMonthlyAmount(monthlyAmountCandidates[0] ?? 30000);
    setNotes("");
  }, [open, monthlyAmountCandidates]);

  const totalAmount = useMemo(
    () => monthlyAmount * periodMonths,
    [monthlyAmount, periodMonths],
  );

  const endMonth = useMemo(() => {
    if (!/^\d{4}-\d{2}-01$/.test(startMonth)) return null;
    try {
      return computeEndMonth(startMonth, periodMonths);
    } catch {
      return null;
    }
  }, [startMonth, periodMonths]);

  const previewLabel = useMemo(() => {
    if (!endMonth) return "";
    return formatPrepaymentLabel(
      {
        id: "preview",
        team_id: "",
        user_id: null,
        member_id: null,
        member_name: null,
        amount: totalAmount,
        period_months: periodMonths,
        start_month: startMonth,
        end_month: endMonth,
        status: "active",
        cancelled_at: null,
        cancelled_by: null,
        linked_dues_record_id: null,
        notes: null,
        recorded_by: null,
        recorded_at: "",
      },
      startMonth.slice(0, 7), // 시작 월 기준으로 라벨링
    );
  }, [endMonth, totalAmount, periodMonths, startMonth]);

  if (!open) return null;

  const selectedMember = members.find((m) => m.memberId === memberId);
  const canSubmit =
    !!memberId &&
    !!selectedMember &&
    monthlyAmount > 0 &&
    PERIOD_OPTIONS.includes(periodMonths) &&
    /^\d{4}-\d{2}-01$/.test(startMonth) &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit || !selectedMember) return;
    setSubmitting(true);
    const { error } = await apiMutate("/api/dues/prepayments", "POST", {
      memberId: selectedMember.memberId,
      userId: selectedMember.id.startsWith("unlinked_") ? null : selectedMember.id,
      memberName: selectedMember.name,
      amount: totalAmount,
      periodMonths,
      startMonth,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    if (error) {
      onError(error);
      return;
    }
    await onSuccess(
      `${selectedMember.name} ${periodMonths}개월 선납 등록 완료 (${formatAmount(totalAmount)})`,
    );
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prepayment-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-background shadow-2xl border border-border">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 id="prepayment-modal-title" className="text-base font-semibold">
              회비 선납 등록
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">
          {/* 회원 선택 */}
          <div className="space-y-1.5">
            <Label htmlFor="prepay-member">회원 선택</Label>
            <NativeSelect
              id="prepay-member"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            >
              <option value="">— 선택 —</option>
              {members.map((m) => (
                <option key={m.memberId} value={m.memberId}>
                  {m.name}
                  {m.role === "PRESIDENT" ? " (회장)" : m.role === "STAFF" ? " (운영진)" : ""}
                </option>
              ))}
            </NativeSelect>
          </div>

          {/* 시작월 */}
          <div className="space-y-1.5">
            <Label htmlFor="prepay-start">시작 월</Label>
            <Input
              id="prepay-start"
              type="month"
              value={startMonth.slice(0, 7)}
              onChange={(e) => {
                const v = e.target.value;
                if (/^\d{4}-\d{2}$/.test(v)) setStartMonth(`${v}-01`);
              }}
            />
            <p className="text-xs text-muted-foreground">
              해당 월부터 선납 기간이 시작됩니다 (기본: 다음 달).
            </p>
          </div>

          {/* 기간 */}
          <div className="space-y-1.5">
            <Label>기간</Label>
            <div className="grid grid-cols-3 gap-2">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodMonths(p)}
                  className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                    periodMonths === p
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:bg-secondary"
                  }`}
                >
                  {p}개월
                </button>
              ))}
            </div>
          </div>

          {/* 월 회비 */}
          <div className="space-y-1.5">
            <Label htmlFor="prepay-monthly">월 회비</Label>
            {monthlyAmountCandidates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {monthlyAmountCandidates.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setMonthlyAmount(c)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      monthlyAmount === c
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {formatAmount(c)}
                  </button>
                ))}
              </div>
            )}
            <Input
              id="prepay-monthly"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              value={monthlyAmount || ""}
              onChange={(e) => setMonthlyAmount(Number(e.target.value) || 0)}
            />
          </div>

          {/* 미리보기 박스 */}
          {endMonth && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <CalendarDays className="h-3.5 w-3.5" />
                미리보기
              </div>
              <p className="text-sm font-semibold text-foreground">
                {selectedMember?.name ?? "회원"} · {previewLabel}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">기간:</span>{" "}
                <span className="font-medium text-foreground">
                  {startMonth.slice(0, 7)} ~ {endMonth.slice(0, 7)}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">합계:</span>{" "}
                <span className="font-bold text-primary">{formatAmount(totalAmount)}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({formatAmount(monthlyAmount)} × {periodMonths}개월)
                </span>
              </p>
            </div>
          )}

          {/* 메모 */}
          <div className="space-y-1.5">
            <Label htmlFor="prepay-notes">메모 (선택)</Label>
            <Textarea
              id="prepay-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="현금 수령, 계좌이체, 영수증 발행 여부 등"
            />
          </div>

          {/* 안내 박스 */}
          <div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>선납 기간 {periodMonths}개월이 자동으로 "납부 완료" 표시됩니다.</p>
              <p>입금 거래 기록은 입출금 탭에서 별도로 등록해 주세요.</p>
              <p>취소 시 해당 월들이 다시 미납으로 돌아갑니다.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-border bg-background px-5 py-3 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1"
          >
            {submitting ? "등록 중..." : "선납 등록"}
          </Button>
        </div>
      </div>
    </div>
  );
}
