"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/Modal";
import { apiMutate } from "@/lib/useApi";
import { useToast } from "@/lib/ToastContext";
import { useConfirm } from "@/lib/ConfirmContext";
import type { PlayerRating } from "./types";

interface Props {
  matchId: string;
  rateeId: string;
  rateeName: string;
  /** 기존 평가 (수정 모드) — 없으면 신규 작성 */
  existing?: PlayerRating | null;
  onSaved: (rating: PlayerRating) => void;
  onClose: () => void;
}

export default function PlayerRatingDialog({
  matchId,
  rateeId,
  rateeName,
  existing,
  onSaved,
  onClose,
}: Props) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [score, setScore] = useState<number>(existing?.score ?? 7.0);
  const [comment, setComment] = useState<string>(existing?.comment ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const payload = existing
      ? { score, comment: comment.trim() || null }
      : { matchId, rateeId, score, comment: comment.trim() || null };
    const path = existing ? `/api/player-ratings/${existing.id}` : "/api/player-ratings";
    const method = existing ? "PUT" : "POST";
    const { data, error } = await apiMutate<{ rating: PlayerRating }>(path, method, payload);
    setSaving(false);
    if (error || !data) {
      showToast(error ?? "저장에 실패했습니다", "error");
      return;
    }
    showToast(existing ? "평점을 수정했어요" : "평점을 저장했어요", "success");
    onSaved(data.rating);
    onClose();
  }

  async function handleDelete() {
    if (!existing) return;
    // window.confirm 대신 useConfirm — PWA/인앱브라우저에서 window.confirm 이 무음 차단될 수 있음
    const ok = await confirm({ title: `${rateeName} 평점을 삭제할까요?`, variant: "destructive", confirmLabel: "삭제" });
    if (!ok) return;
    setSaving(true);
    const { error } = await apiMutate(`/api/player-ratings/${existing.id}`, "DELETE");
    setSaving(false);
    if (error) {
      showToast(error, "error");
      return;
    }
    showToast("평점을 삭제했어요", "success");
    // 호출자 쪽에서 refetch 처리하도록 onSaved 대신 onClose만
    onClose();
  }

  const scoreLabel = score.toFixed(1);

  return (
    <Modal open onClose={onClose} ariaLabel={`${rateeName} 평점`}>
      <div className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold">
            <span className="text-muted-foreground">평가 대상 · </span>
            {rateeName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-end justify-between">
            <label className="text-xs font-semibold text-muted-foreground">평점</label>
            <span className="flex items-center gap-1 text-2xl font-bold tabular-nums">
              <Star className="h-5 w-5 text-[hsl(var(--warning))]" fill="currentColor" />
              {scoreLabel}
            </span>
          </div>
          <input
            type="range"
            min={1.0}
            max={10.0}
            step={0.1}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="w-full accent-[hsl(var(--primary))]"
            aria-label="평점"
          />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>1.0</span>
            <span>5.5</span>
            <span>10.0</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            코멘트 <span className="text-[11px] font-normal">(선택, 500자 이내 — 본인만 봅니다)</span>
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="예: 풀백 라인 백업 좋았어요. 다음엔 빌드업 시 첫 터치 한 박자만 더."
            rows={4}
            className="resize-none"
          />
          <p className="mt-1 text-right text-[11px] text-muted-foreground">
            {comment.length}/500
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          {existing ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={handleDelete}
              className="text-destructive hover:bg-[hsl(var(--destructive)_/_0.1)] hover:text-destructive"
            >
              삭제
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              취소
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "저장 중…" : existing ? "수정" : "저장"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
