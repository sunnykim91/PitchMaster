"use client";

import { memo, useRef, useState } from "react";
import { apiMutate } from "@/lib/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { cn, formatTime } from "@/lib/utils";
import { shareMatchResult } from "@/lib/kakaoShare";
import type {
  Match,
  MatchDiary,
  SimpleRosterPlayer,
} from "./matchDetailTypes";
import { WEATHER_OPTIONS, CONDITION_OPTIONS } from "./matchDetailTypes";

export interface MatchDiaryTabProps {
  matchId: string;
  match: Match;
  diary: MatchDiary;
  score: string;
  canManage: boolean;
  fullRoster: SimpleRosterPlayer[];
  voteCounts: Record<string, number>;
  /** 일지 refetch */
  refetchDiary: () => Promise<unknown>;
}

function MatchDiaryTabInner({
  matchId,
  match,
  diary,
  score,
  canManage,
  fullRoster,
  voteCounts,
  refetchDiary,
}: MatchDiaryTabProps) {
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [isDiaryEditing, setIsDiaryEditing] = useState(false);
  const diaryFormRef = useRef<HTMLFormElement>(null);

  /* ── 경기 일지 저장 ── */
  async function handleSaveDiary(formData: FormData) {
    const weather = String(formData.get("weather") || "") || undefined;
    const condition = String(formData.get("condition") || "") || undefined;
    const memo = String(formData.get("memo") || "") || undefined;

    await apiMutate("/api/diary", "POST", {
      matchId,
      weather,
      condition,
      memo,
    });
    setIsDiaryEditing(false);
    await refetchDiary();
  }

  async function handleShare() {
    const timeStr = match.endTime ? `${formatTime(match.time)} ~ ${formatTime(match.endTime)}` : formatTime(match.time);
    const message = `PitchMaster 경기 결과\n${match.date} ${timeStr}\n${match.location}\n스코어 ${score}`;
    await navigator.clipboard.writeText(message);
    setShareMessage("경기 결과 요약이 클립보드에 복사되었습니다.");
    setTimeout(() => setShareMessage(null), 2000);
  }

  function handleKakaoShare() {
    shareMatchResult({
      matchId,
      date: match.date,
      score,
      opponent: match.opponent,
      mvp: (() => {
        const topId = Object.entries(voteCounts).sort(([, a], [, b]) => b - a)[0]?.[0];
        return topId ? fullRoster.find((p) => p.id === topId)?.name : undefined;
      })(),
    });
  }

  async function handleShareCardDownload() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    try {
      const res = await fetch(`/api/share-card?matchId=${matchId}`);
      if (!res.ok) throw new Error("fail");
      const blob = await res.blob();

      if (!isMobile && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setShareMessage("카드 이미지가 클립보드에 복사되었습니다.");
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "match-card.png";
        link.click();
        URL.revokeObjectURL(url);
        setShareMessage("카드 이미지가 저장되었습니다.");
      }
    } catch {
      const link = document.createElement("a");
      link.href = `/api/share-card?matchId=${matchId}`;
      link.download = "match-card.png";
      link.click();
      setShareMessage("카드 이미지가 저장되었습니다.");
    }
    setTimeout(() => setShareMessage(null), 2000);
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ══ 경기 결과 공유 ══ */}
      <Card className="rounded-2xl border-0 overflow-hidden shadow-lg">
        <CardContent className="p-0">
          <div className="relative overflow-hidden bg-gradient-to-br from-card via-secondary to-background p-8 text-center">
            <div className="relative z-10">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary">PITCHMASTER</span>
              <div className="mt-3 text-5xl font-black tabular-nums tracking-tighter">{score}</div>
              <div className="mt-2 font-medium text-muted-foreground">
                {match.opponent ? `vs ${match.opponent}` : "친선 경기"}
              </div>
              <div className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>{match.date}</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                <span>{formatTime(match.time)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 bg-card p-4">
            <Button type="button" className="flex-1 min-h-[48px] font-semibold bg-[hsl(var(--kakao))] text-[hsl(var(--kakao-foreground))] hover:bg-[hsl(var(--kakao))]/90" onClick={handleKakaoShare}>
              카카오톡 공유
            </Button>
            <Button type="button" variant="outline" className="flex-1 min-h-[48px] font-semibold" onClick={handleShare}>
              결과 복사
            </Button>
          </div>
          {shareMessage && <p className="px-4 pb-3 text-xs text-primary">{shareMessage}</p>}
        </CardContent>
      </Card>

      {/* ══ 경기 일지 ══ */}
      <Card className="rounded-xl border-border/30">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-bold">경기 일지</CardTitle>
          {canManage && !isDiaryEditing && (
            <Button type="button" size="sm" variant="ghost" className="h-8 px-3 text-sm font-medium text-primary"
              onClick={() => setIsDiaryEditing(true)}>
              {diary.memo || diary.weather || diary.condition ? "수정" : "작성하기"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isDiaryEditing ? (
            <form
              ref={diaryFormRef}
              action={(formData) => handleSaveDiary(formData)}
              className="space-y-5"
            >
              {/* 날씨 — 5개 버튼 */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">날씨</p>
                <div className="grid grid-cols-5 gap-2">
                  {WEATHER_OPTIONS.map((w) => {
                    const icons: Record<string, string> = { "맑음": "☀️", "흐림": "☁️", "비": "🌧️", "눈": "❄️", "바람": "💨" };
                    return (
                      <label key={w} className="cursor-pointer">
                        <input type="radio" name="weather" value={w} defaultChecked={diary.weather === w} className="peer sr-only" />
                        <div className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-muted-foreground transition-all peer-checked:bg-primary peer-checked:text-primary-foreground hover:bg-secondary">
                          <span className="text-lg">{icons[w] ?? "🌤️"}</span>
                          <span className="text-[10px] font-medium">{w}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 팀 컨디션 — 5개 버튼 */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">팀 컨디션</p>
                <div className="grid grid-cols-5 gap-2">
                  {CONDITION_OPTIONS.map((c) => (
                    <label key={c} className="cursor-pointer">
                      <input type="radio" name="condition" value={c} defaultChecked={diary.condition === c} className="peer sr-only" />
                      <div className={cn(
                        "rounded-xl p-2.5 text-center text-xs font-semibold transition-all",
                        "peer-checked:text-primary-foreground hover:bg-secondary text-muted-foreground",
                        c === "최상" || c === "좋음" ? "peer-checked:bg-[hsl(var(--success))]" :
                        c === "보통" ? "peer-checked:bg-muted peer-checked:text-foreground" :
                        "peer-checked:bg-destructive"
                      )}>
                        {c}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 메모 */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">메모</p>
                <Textarea
                  name="memo"
                  defaultValue={diary.memo ?? ""}
                  placeholder="경기에 대한 메모를 작성하세요..."
                  rows={5}
                  className="min-h-[140px] resize-none rounded-xl border-0 bg-secondary focus-visible:ring-primary leading-relaxed"
                />
              </div>

              <Button type="submit" className="w-full min-h-[48px] rounded-xl font-semibold">
                저장
              </Button>
            </form>
          ) : diary.memo || diary.weather || diary.condition ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {diary.weather && (
                  <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 text-sm">
                    {diary.weather === "맑음" ? "☀️" : diary.weather === "흐림" ? "☁️" : diary.weather === "비" ? "🌧️" : diary.weather === "눈" ? "❄️" : "💨"} {diary.weather}
                  </Badge>
                )}
                {diary.condition && (
                  <Badge className={cn(
                    "py-1.5 px-3 text-sm border-0",
                    diary.condition === "최상" || diary.condition === "좋음" ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]" :
                    diary.condition === "보통" ? "bg-muted text-muted-foreground" :
                    "bg-destructive/20 text-destructive"
                  )}>
                    컨디션: {diary.condition}
                  </Badge>
                )}
              </div>
              {diary.memo && (
                <div className="rounded-xl bg-secondary/30 p-4">
                  <p className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
                    {diary.memo}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              아직 작성된 경기 일지가 없습니다. 날씨, 컨디션, 느낀 점 등을 기록해보세요.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const MatchDiaryTab = memo(MatchDiaryTabInner);
