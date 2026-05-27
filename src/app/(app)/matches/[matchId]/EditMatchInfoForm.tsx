"use client";

import { useState } from "react";
import { apiMutate } from "@/lib/useApi";
import { Button } from "@/components/ui/button";
import { cn, formatTime } from "@/lib/utils";
import { useToast } from "@/lib/ToastContext";
import type { Match } from "./matchDetailTypes";

export interface EditMatchInfoFormProps {
  matchId: string;
  match: Match;
  sportType: "SOCCER" | "FUTSAL";
  onClose: () => void;
  onSaved: () => Promise<unknown> | unknown;
}

export default function EditMatchInfoForm({
  matchId,
  match,
  sportType,
  onClose,
  onSaved,
}: EditMatchInfoFormProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [editingSportType, setEditingSportType] = useState<"SOCCER" | "FUTSAL">(
    (match.sportType as "SOCCER" | "FUTSAL" | null) ?? sportType
  );
  const editingIsFutsal = editingSportType === "FUTSAL";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const playerCountVal = fd.get("playerCount");
    const { error } = await apiMutate("/api/matches", "PUT", {
      id: matchId,
      date: fd.get("date"),
      time: fd.get("time"),
      endTime: fd.get("endTime") || null,
      location: fd.get("location"),
      opponent: fd.get("opponent"),
      voteDeadline: fd.get("voteDeadline") || null,
      playerCount: playerCountVal ? Number(playerCountVal) : undefined,
      sportType: match.matchType === "EVENT" ? null : editingSportType,
    });
    setSaving(false);
    if (!error) {
      showToast("경기 정보가 수정되었습니다.");
      onClose();
      await onSaved();
    } else {
      showToast("수정에 실패했습니다.", "error");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <style>{`
        .edit-form input[type="date"]::-webkit-calendar-picker-indicator,
        .edit-form input[type="datetime-local"]::-webkit-calendar-picker-indicator { opacity: 0; width: 100%; height: 100%; position: absolute; top: 0; left: 0; cursor: pointer; }
      `}</style>
      <div className="edit-form space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">날짜</p>
            <input type="date" name="date" defaultValue={match.date} required className="relative h-12 w-full rounded-xl border-0 bg-secondary px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">{match.matchType === "EVENT" ? "일정 제목" : "상대팀"}</p>
            <input name="opponent" defaultValue={match.opponent ?? ""} placeholder={match.matchType === "EVENT" ? "예: 연말 회식" : "미정"} className="h-12 w-full rounded-xl border-0 bg-secondary px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">시작</p>
            <select name="time" defaultValue={formatTime(match.time)} className="h-12 w-full appearance-none rounded-xl border-0 bg-secondary px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              {Array.from({ length: 48 }, (_, i) => { const h = String(Math.floor(i / 2)).padStart(2, "0"); const m = i % 2 === 0 ? "00" : "30"; return <option key={i} value={`${h}:${m}`}>{h}:{m}</option>; })}
            </select>
          </div>
          <div>
            <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">종료</p>
            <select name="endTime" defaultValue={match.endTime ? formatTime(match.endTime) : ""} className="h-12 w-full appearance-none rounded-xl border-0 bg-secondary px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">미설정</option>
              {Array.from({ length: 48 }, (_, i) => { const h = String(Math.floor(i / 2)).padStart(2, "0"); const m = i % 2 === 0 ? "00" : "30"; return <option key={i} value={`${h}:${m}`}>{h}:{m}</option>; })}
            </select>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">장소</p>
          <input name="location" defaultValue={match.location} required className="h-12 w-full rounded-xl border-0 bg-secondary px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        {/* 종목 선택 — 변경 시 인원 옵션 동적 변경 */}
        {match.matchType !== "EVENT" && (
          <div>
            <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">종목</p>
            <div className="flex gap-2">
              {([
                { type: "SOCCER" as const, label: "⚽ 축구", color: "primary" },
                { type: "FUTSAL" as const, label: "⚽ 풋살", color: "info" },
              ]).map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setEditingSportType(item.type)}
                  className={cn(
                    "flex-1 min-h-[44px] rounded-xl border-2 px-2 text-sm font-bold transition-all",
                    editingSportType === item.type
                      ? `border-[hsl(var(--${item.color}))] bg-[hsl(var(--${item.color}))]/15 text-[hsl(var(--${item.color}))] shadow-sm`
                      : "border-border bg-secondary/40 text-muted-foreground hover:border-foreground/30"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">참가 인원</p>
            <select key={editingSportType} name="playerCount" defaultValue={String(match.playerCount ?? (editingIsFutsal ? 6 : 11))} className="h-12 w-full appearance-none rounded-xl border-0 bg-secondary px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              {(editingIsFutsal ? [3, 4, 5, 6] : [8, 9, 10, 11]).map((n) => (
                <option key={n} value={n}>{n}:{n} ({n}명)</option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">투표 마감</p>
            <input type="datetime-local" name="voteDeadline" defaultValue={match.voteDeadline?.slice(0, 16) ?? ""} className="relative h-12 w-full rounded-xl border-0 bg-secondary px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={onClose}>취소</Button>
          <Button type="submit" className="flex-1 h-12 rounded-xl" loading={saving} loadingText="저장 중...">저장</Button>
        </div>
      </div>
    </form>
  );
}
