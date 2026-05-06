"use client";

import { memo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, X as XIcon, Trash2, ImageIcon, MessageCircle, Copy, Download, RefreshCw } from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { apiMutate } from "@/lib/useApi";
import { useToast } from "@/lib/ToastContext";
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
  /** AI 경기 후기 (COMPLETED 경기 + 캐시 있을 때만) */
  aiSummary?: string | null;
  /** AI 재생성 가능 여부 (김선휘 Feature Flag) */
  canRegenerateAi?: boolean;
  /** AI 후기 재생성 횟수 (0 = 재생성 가능, 1 = 소진) */
  aiSummaryRegenerateCount?: number;
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
  aiSummary,
  canRegenerateAi,
  aiSummaryRegenerateCount = 0,
}: MatchDiaryTabProps) {
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [currentAiSummary, setCurrentAiSummary] = useState<string | null>(aiSummary ?? null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [regenerateUsed, setRegenerateUsed] = useState(aiSummaryRegenerateCount >= 1);
  const [autoGenStatus, setAutoGenStatus] = useState<"idle" | "loading" | "error" | "blocked">("idle");
  const [autoGenError, setAutoGenError] = useState<string | null>(null);

  /**
   * 첫 생성 자동 트리거 — SSR 에서 제거된 후기 생성을 클라이언트에서 대체.
   * 조건: canRegenerateAi (김선휘) + COMPLETED + REGULAR + 캐시 없음.
   * StrictMode 중복 실행 방지용 ref 사용.
   */
  const autoGenTriedRef = useRef(false);
  useEffect(() => {
    if (autoGenTriedRef.current) return;
    if (currentAiSummary) return;
    if (!canRegenerateAi) return;
    if (match.status !== "COMPLETED") return;
    if ((match.matchType ?? "REGULAR") !== "REGULAR") return;
    autoGenTriedRef.current = true;
    setAutoGenStatus("loading");
    (async () => {
      let received = false;
      try {
        const { consumeSseStream } = await import("@/lib/sseStream");
        await consumeSseStream(`/api/ai/match-summary/${matchId}`, { regenerate: false }, {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          onChunk: (text) => { received = true; setCurrentAiSummary((prev) => (prev ?? "") + text); },
          // eslint-disable-next-line react-hooks/set-state-in-effect
          onReplace: (text) => { received = true; setCurrentAiSummary(text); },
          onError: (msg) => {
            // insufficient_data 등 가드 메시지 노출. 빈 메시지면 일반 실패 안내.
            const isInsufficient = msg?.includes?.("기록") || msg?.includes?.("insufficient");
            setAutoGenStatus(isInsufficient ? "blocked" : "error");
            setAutoGenError(msg ?? "후기 생성에 실패했어요");
          },
          onDone: () => {
            if (received) setAutoGenStatus("idle");
            else {
              // 서버가 done만 보내고 본문이 없는 비정상 케이스
              setAutoGenStatus("error");
              setAutoGenError("서버 응답이 비어있어요. 잠시 후 재시도해 주세요");
            }
          },
        });
      } catch (err) {
        setAutoGenStatus("error");
        setAutoGenError(err instanceof Error ? err.message : "네트워크 오류로 자동 생성에 실패했어요");
      }
    })();
  }, [canRegenerateAi, currentAiSummary, match.status, match.matchType, matchId]);

  // 수동 재시도 — 자동 트리거 실패 후 사용자가 다시 누를 수 있게.
  async function handleAutoRetry() {
    autoGenTriedRef.current = false;
    setAutoGenError(null);
    setAutoGenStatus("loading");
    try {
      const { consumeSseStream } = await import("@/lib/sseStream");
      let received = false;
      await consumeSseStream(`/api/ai/match-summary/${matchId}`, { regenerate: false }, {
        onChunk: (text) => { received = true; setCurrentAiSummary((prev) => (prev ?? "") + text); },
        onReplace: (text) => { received = true; setCurrentAiSummary(text); },
        onError: (msg) => {
          const isInsufficient = msg?.includes?.("기록") || msg?.includes?.("insufficient");
          setAutoGenStatus(isInsufficient ? "blocked" : "error");
          setAutoGenError(msg ?? "후기 생성에 실패했어요");
        },
        onDone: () => {
          if (received) setAutoGenStatus("idle");
          else {
            setAutoGenStatus("error");
            setAutoGenError("서버 응답이 비어있어요. 잠시 후 재시도해 주세요");
          }
        },
      });
    } catch (err) {
      setAutoGenStatus("error");
      setAutoGenError(err instanceof Error ? err.message : "네트워크 오류로 자동 생성에 실패했어요");
    }
  }

  async function handleRegenerateAi() {
    setRegenerating(true);
    setRegenerateError(null);
    setCurrentAiSummary(""); // 스트리밍 시작 — 빈 문자열로 초기화해 progressive 렌더
    try {
      const { consumeSseStream } = await import("@/lib/sseStream");
      await consumeSseStream(`/api/ai/match-summary/${matchId}`, { regenerate: true }, {
        onChunk: (text) => {
          setCurrentAiSummary((prev) => (prev ?? "") + text);
        },
        onReplace: (text) => {
          setCurrentAiSummary(text);
        },
        onError: (msg) => {
          setRegenerateError(msg);
        },
        onDone: () => {
          setRegenerateUsed(true); // 재생성 완료 → 잔여 0
        },
      });
    } catch (err) {
      setRegenerateError(err instanceof Error ? err.message : "네트워크 오류");
      setCurrentAiSummary(aiSummary ?? null); // 실패 시 원래 값으로 복귀
    } finally {
      setRegenerating(false);
    }
  }
  const { showToast } = useToast();
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
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
        const json = await res.json();
        if (!res.ok) {
          showToast(json.error ?? "사진 업로드에 실패했습니다.", "error");
          continue;
        }
        if (json.url) newPhotos.push(json.url);
      }
      setPhotos(newPhotos);
      // 바로 DB에 저장 (기존 일지 데이터 보존)
      await apiMutate("/api/diary", "POST", { matchId, weather: diary.weather, condition: diary.condition, memo: diary.memo, photos: newPhotos });
      await refetchDiary();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "사진 업로드 중 오류가 발생했습니다.", "error");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
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
    <div className="space-y-4">
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
                    onClick={(e) => { e.stopPropagation(); if (window.confirm("이 사진을 삭제하시겠습니까?")) handleRemovePhoto(url); }}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-destructive shadow-sm"
                    aria-label="사진 삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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

      {/* ══ AI가 정리한 경기 (수동 작성 일지와 구분 위해 스코어·사진 아래에 배치) ══ */}
      {/* 빈 상태에서도 카드 노출 — canRegenerateAi + COMPLETED + REGULAR 이면 가이드/로딩/에러 표시 */}
      {!currentAiSummary &&
        canRegenerateAi &&
        match.status === "COMPLETED" &&
        (match.matchType ?? "REGULAR") === "REGULAR" && (
          <Card className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-primary/15 text-[10px] font-black text-primary">AI</span>
                AI가 정리한 경기
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {autoGenStatus === "loading" ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <span className="inline-block h-3 w-1.5 animate-pulse bg-primary/60 align-middle" />
                  경기 기록을 정리하는 중…
                </div>
              ) : autoGenStatus === "blocked" ? (
                <div className="space-y-2 py-1">
                  <p className="text-sm text-muted-foreground">
                    {autoGenError ?? "기록(득점·MVP·참석) 중 하나라도 입력돼야 후기를 만들 수 있어요."}
                  </p>
                  <p className="text-[11px] text-muted-foreground/80">
                    기록 탭에서 득점을 추가하거나, 출석 탭에서 참석 체크를 마친 뒤 다시 시도해 주세요.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={handleAutoRetry}
                  >
                    다시 시도
                  </Button>
                </div>
              ) : autoGenStatus === "error" ? (
                <div className="space-y-2 py-1">
                  <p className="text-sm text-[hsl(var(--loss))]">
                    {autoGenError ?? "후기 생성에 실패했어요."}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={handleAutoRetry}
                  >
                    다시 시도
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 py-1">
                  <p className="text-sm text-muted-foreground">
                    경기 기록을 분석해서 후기를 자동으로 만들어드려요.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={handleAutoRetry}
                  >
                    후기 만들기
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      {currentAiSummary && (
        <Card className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-primary/15 text-[10px] font-black text-primary">AI</span>
              AI가 정리한 경기
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {currentAiSummary}
              {regenerating && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary/60 align-middle" />}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={async () => {
                  if (!currentAiSummary) return;
                  try {
                    await navigator.clipboard.writeText(currentAiSummary);
                    setShareMessage("후기가 복사되었습니다");
                    setTimeout(() => setShareMessage(null), 2000);
                  } catch {
                    setShareMessage("복사에 실패했습니다");
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                복사
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 text-xs bg-[hsl(var(--kakao))] text-[hsl(var(--kakao-foreground))] hover:bg-[hsl(var(--kakao))]/90"
                onClick={async () => {
                  if (!currentAiSummary) return;
                  const url = typeof window !== "undefined" ? window.location.href : "";
                  const shareData = {
                    title: `⚽ ${match.date} 경기 후기`,
                    text: currentAiSummary,
                    url,
                  };
                  try {
                    if (typeof navigator !== "undefined" && navigator.share) {
                      await navigator.share(shareData);
                    } else {
                      await navigator.clipboard.writeText(`${currentAiSummary}\n\n${url}`);
                      setShareMessage("후기+링크가 복사되었습니다. 카톡에 붙여넣기 하세요");
                      setTimeout(() => setShareMessage(null), 2500);
                    }
                  } catch {
                    /* 사용자 취소 — 무시 */
                  }
                }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                카톡 공유
              </Button>
              {canRegenerateAi && !regenerateUsed && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={handleRegenerateAi}
                  disabled={regenerating}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", regenerating && "animate-spin")} />
                  {regenerating ? "재생성 중..." : "재생성"}
                </Button>
              )}
            </div>
            {regenerateError && (
              <p className="mt-2 text-xs text-destructive">{regenerateError}</p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground/70">
              경기 데이터를 기반으로 AI가 작성했어요. 팀원 전체가 같은 후기를 봅니다.
              {canRegenerateAi && (
                <span className={cn("ml-1", regenerateUsed ? "text-muted-foreground/50" : "text-primary/70")}>
                  {regenerateUsed ? "· 재생성 소진" : "· 재생성 1회 가능"}
                </span>
              )}
            </p>
            {shareMessage && (
              <p className="mt-2 text-xs text-muted-foreground">{shareMessage}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══ 경기 일지 (수동 작성) ══ */}
      <Card className="rounded-xl border-border/30">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-bold">우리 팀 경기 일지</CardTitle>
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
