"use client";

import { memo, useRef, useState } from "react";
import Image from "next/image";
import { Camera, X as XIcon, ImageIcon, MessageCircle, Copy, Download } from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
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
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>(diary.photos ?? []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  /* ── 사진 업로드 ── */
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);
    const newPhotos = [...photos];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const json = await res.json();
      if (json.url) newPhotos.push(json.url);
    }
    setPhotos(newPhotos);
    // 바로 DB에 저장 (기존 일지 데이터 보존)
    await apiMutate("/api/diary", "POST", { matchId, weather: diary.weather, condition: diary.condition, memo: diary.memo, photos: newPhotos });
    await refetchDiary();
    setUploadingPhoto(false);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  async function handleRemovePhoto(url: string) {
    const newPhotos = photos.filter((p) => p !== url);
    setPhotos(newPhotos);
    await apiMutate("/api/diary", "POST", { matchId, weather: diary.weather, condition: diary.condition, memo: diary.memo, photos: newPhotos });
    await refetchDiary();
  }

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
      photos,
    });
    setIsDiaryEditing(false);
    await refetchDiary();
  }

  async function handleShare() {
    const timeStr = match.endTime ? `${formatTime(match.time)} ~ ${formatTime(match.endTime)}` : formatTime(match.time);
    const isInternal = match.matchType === "INTERNAL";

    // MVP 정보
    const topId = Object.entries(voteCounts).sort(([, a], [, b]) => b - a)[0]?.[0];
    const mvpName = topId ? fullRoster.find((p) => p.id === topId)?.name : null;

    // 득점자 정보
    const scorers = fullRoster.filter((p) => voteCounts[p.id]).map((p) => `${p.name} (${voteCounts[p.id]}표)`);

    const lines = [
      `⚽ PitchMaster 경기 결과`,
      ``,
      `📅 ${match.date} ${timeStr}`,
      `📍 ${match.location}`,
      ``,
      isInternal ? `🏟️ 자체전` : match.opponent ? `🆚 vs ${match.opponent}` : `🏟️ 친선 경기`,
      isInternal ? `⚽ A팀 ${score.split(":")[0]?.trim()} : B팀 ${score.split(":")[1]?.trim()}` : `⚽ 스코어 ${score}`,
    ];
    if (mvpName) lines.push(`🏆 MVP: ${mvpName}`);
    if (diary.weather) lines.push(`🌤️ 날씨: ${diary.weather}`);
    if (diary.condition) lines.push(`💪 컨디션: ${diary.condition}`);
    if (diary.memo) lines.push(``, `📝 ${diary.memo}`);
    lines.push(``, `👉 https://www.pitch-master.app/matches/${matchId}`);

    await navigator.clipboard.writeText(lines.join("\n"));
    setShareMessage("경기 결과가 복사되었습니다.");
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
              {match.matchType === "INTERNAL" ? (
                <div className="mt-3">
                  <div className="flex items-center justify-center gap-4 text-5xl font-black tabular-nums tracking-tighter">
                    <span className="text-primary">{score.split(":")[0]?.trim()}</span>
                    <span className="text-muted-foreground">:</span>
                    <span className="text-[hsl(var(--info))]">{score.split(":")[1]?.trim()}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-3 text-sm font-medium">
                    <span className="text-primary">A팀</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="text-[hsl(var(--info))]">B팀</span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-5xl font-black tabular-nums tracking-tighter">{score}</div>
              )}
              <div className="mt-2 font-medium text-muted-foreground">
                {match.matchType === "INTERNAL" ? "자체전" : match.opponent ? `vs ${match.opponent}` : "친선 경기"}
              </div>
              <div className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>{match.date}</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                <span>{formatTime(match.time)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 bg-card p-4">
            <Button type="button" className="flex-1 min-h-[48px] gap-2 font-semibold bg-[hsl(var(--kakao))] text-[hsl(var(--kakao-foreground))] hover:bg-[hsl(var(--kakao))]/90" onClick={handleKakaoShare}>
              <MessageCircle className="h-4 w-4" />카카오톡 공유
            </Button>
            <Button type="button" variant="outline" className="flex-1 min-h-[48px] gap-2 font-semibold" onClick={handleShare}>
              <Copy className="h-4 w-4" />결과 복사
            </Button>
          </div>
          {shareMessage && (
            <div className="mx-4 mb-3 rounded-lg bg-[hsl(var(--success))]/10 px-3 py-2 text-center text-xs font-medium text-[hsl(var(--success))]">
              ✓ {shareMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══ 경기 사진 ══ */}
      <Card className="rounded-xl border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <ImageIcon className="h-4 w-4 text-primary" />
            경기 사진
            {photos.length > 0 && <Badge variant="secondary" className="text-xs">{photos.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url) => (
              <div key={url} className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-secondary" onClick={() => setLightboxSrc(url)}>
                <Image src={url} alt="경기 사진" fill className="object-cover" sizes="120px" />
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(url)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                    aria-label="사진 삭제"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {canManage && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border/50 bg-secondary/30 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs font-medium">{uploadingPhoto ? "업로드 중..." : "사진 추가"}</span>
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />
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
                        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-muted-foreground transition-all peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary hover:bg-secondary/80">
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
                        "rounded-xl border border-border p-2.5 text-center text-xs font-semibold transition-all",
                        "hover:bg-secondary/80 text-muted-foreground",
                        c === "최상" || c === "좋음" ? "peer-checked:bg-[hsl(var(--success))] peer-checked:text-white peer-checked:border-[hsl(var(--success))]" :
                        c === "보통" ? "peer-checked:bg-muted peer-checked:text-foreground peer-checked:border-muted" :
                        "peer-checked:bg-destructive peer-checked:text-white peer-checked:border-destructive"
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

      <ImageLightbox src={lightboxSrc} alt="경기 사진" onClose={() => setLightboxSrc(null)} />
    </div>
  );
}

export const MatchDiaryTab = memo(MatchDiaryTabInner);
