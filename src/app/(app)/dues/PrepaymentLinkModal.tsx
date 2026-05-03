"use client";

import { useEffect, useState } from "react";
import { X, Wallet, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiMutate } from "@/lib/useApi";
import { formatAmount } from "@/lib/formatters";

type Candidate = {
  id: string;
  amount: number;
  description: string;
  recordedAt: string;
  userId: string | null;
};

type Props = {
  open: boolean;
  exemptionId: string | null;
  memberName: string;
  /** 현재 연결된 거래 id (있으면 "연결 해제" 버튼 노출) */
  currentLinkedId: string | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
};

export default function PrepaymentLinkModal({
  open,
  exemptionId,
  memberName,
  currentLinkedId,
  onClose,
  onSuccess,
  onError,
}: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !exemptionId) return;
    setLoading(true);
    setSelectedId(currentLinkedId ?? "");
    fetch(`/api/dues/member-status?candidates=${exemptionId}`)
      .then((r) => r.json())
      .then((res) => {
        const list: Candidate[] = res?.data?.candidates ?? res?.candidates ?? [];
        setCandidates(list);
      })
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false));
  }, [open, exemptionId, currentLinkedId]);

  if (!open || !exemptionId) return null;

  async function handleLink() {
    if (!selectedId || !exemptionId) return;
    setSubmitting(true);
    const { error } = await apiMutate("/api/dues/member-status", "PATCH", {
      id: exemptionId,
      linkedDuesRecordId: selectedId,
    });
    setSubmitting(false);
    if (error) {
      onError(error);
      return;
    }
    onSuccess(`${memberName} 선납 ↔ 입금 연결 완료`);
    onClose();
  }

  async function handleUnlink() {
    if (!exemptionId) return;
    setSubmitting(true);
    const { error } = await apiMutate("/api/dues/member-status", "PATCH", {
      id: exemptionId,
      linkedDuesRecordId: null,
    });
    setSubmitting(false);
    if (error) {
      onError(error);
      return;
    }
    onSuccess(`${memberName} 선납 ↔ 입금 연결 해제`);
    onClose();
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mm}.${dd}`;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prepay-link-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-background shadow-2xl border border-border">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 id="prepay-link-title" className="text-base font-semibold">
              {memberName} 선납 ↔ 입금 연결
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
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            선납 금액·시점과 일치하는 입금 거래 후보입니다 (±3개월). 해당 거래를 선택하면 회계 트랙과 연결됩니다.
          </p>

          {loading ? (
            <p className="text-xs text-muted-foreground/60 py-6 text-center">불러오는 중...</p>
          ) : candidates.length === 0 ? (
            <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">매칭 가능한 입금 거래가 없습니다</p>
              <p>회비 기록 탭에서 해당 입금을 먼저 등록한 뒤 다시 시도해주세요.</p>
              <p>금액·시점이 정확히 일치해야 후보로 노출됩니다.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {candidates.map((c) => {
                const selected = selectedId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatDate(c.recordedAt)}
                      </span>
                      <span className="text-sm font-bold text-primary tabular-nums">
                        +{formatAmount(c.amount)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-foreground truncate">{c.description}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-border bg-background px-5 py-3 flex gap-2">
          {currentLinkedId && (
            <Button
              type="button"
              variant="outline"
              onClick={handleUnlink}
              disabled={submitting}
              className="flex items-center gap-1"
            >
              <Unlink className="h-4 w-4" />
              연결 해제
            </Button>
          )}
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
            onClick={handleLink}
            disabled={!selectedId || selectedId === currentLinkedId || submitting}
            className="flex-1 flex items-center gap-1"
          >
            <Link2 className="h-4 w-4" />
            {submitting ? "처리 중..." : "연결"}
          </Button>
        </div>
      </div>
    </div>
  );
}
