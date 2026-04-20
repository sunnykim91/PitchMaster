"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { formationTemplates } from "@/lib/formations";
import type { AttendingPlayer, GeneratedSquad } from "@/components/AutoFormationBuilder";
import { apiMutate } from "@/lib/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Match, SimpleRosterPlayer, InternalTeamAssignment, Guest } from "./matchDetailTypes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { X, ChevronDown, Users, Plus, Pencil } from "lucide-react";
import { formatPhone } from "@/lib/utils";
import type { SportType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/ToastContext";

/* ── Dynamic imports with loading UI ── */
const TacticsBoardSkeleton = () => (
  <div className="flex flex-col items-center justify-center py-12 gap-3">
    <Skeleton className="h-48 w-full rounded-xl" />
    <p className="text-xs text-muted-foreground">전술판 불러오는 중...</p>
  </div>
);

import TacticsBoard, { type TeamSettings } from "@/components/TacticsBoard";
import AutoFormationBuilder from "@/components/AutoFormationBuilder";
import { AiCoachAnalysisCard } from "@/components/AiCoachAnalysisCard";
import { MatchRoleGuide } from "@/components/MatchRoleGuide";

export interface MatchTacticsTabProps {
  matchId: string;
  match: Match;
  canManage: boolean;
  attendingPlayers: AttendingPlayer[];
  roster: SimpleRosterPlayer[];
  sportType: SportType;
  defaultFormationId?: string;
  internalTeams?: InternalTeamAssignment[];
  refetchInternalTeams?: () => Promise<unknown>;
  guests?: Guest[];
  refetchGuests?: () => Promise<unknown>;
  handleRemoveGuest?: (guestId: string) => Promise<void>;
  /** AI 코치 분석 활성화 여부 (김선휘 Feature Flag) */
  enableAi?: boolean;
  /** 역할 가이드용 — 현재 로그인 사용자 정보 */
  currentUserId: string;
  currentMemberId?: string;
  currentMemberAttended: boolean;
  /**
   * 팀 유니폼 설정 — MatchDetailClient 가 /api/teams 로 이미 로드한 값을 그대로.
   * 전달 안 하면 TacticsBoard 가 자체 fetch + 초기엔 파란색 fallback(#2563eb) flash 발생.
   */
  teamSettings?: TeamSettings;
}

function MatchTacticsTabInner({
  matchId,
  match,
  canManage,
  attendingPlayers,
  roster,
  sportType,
  defaultFormationId,
  internalTeams,
  refetchInternalTeams,
  guests,
  refetchGuests,
  handleRemoveGuest,
  enableAi = false,
  currentUserId,
  currentMemberId,
  currentMemberAttended,
  teamSettings,
}: MatchTacticsTabProps) {
  const [tacticsKey, setTacticsKey] = useState(0);
  const [generatedSquads, setGeneratedSquads] = useState<GeneratedSquad[]>([]);
  const tacticsRef = useRef<HTMLDivElement | null>(null);
  const [tacticsHighlight, setTacticsHighlight] = useState(false);

  // 자동 편성 결과 전술판 반영 시 호출 — 스크롤 + 순간 하이라이트로 흐름 연결 시각화
  function scrollToTacticsBoard() {
    tacticsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTacticsHighlight(true);
    window.setTimeout(() => setTacticsHighlight(false), 1800);
  }
  // Phase B — AI 코치 분석 컨텍스트 (AutoFormationBuilder에서 내려줌, 전술판 아래 카드에서 사용)
  const [aiCoachContext, setAiCoachContext] = useState<{
    placement: Array<{ slot: string; playerName: string }>;
    quarterPlacements: Array<{ quarter: number; assignments: Array<{ slot: string; playerName: string }> }>;
    quarterFormations: Array<{ quarter: number; formation: string }>;
    attendees: Array<{ name: string; preferredPosition?: string | null; isGuest?: boolean }>;
    formationName: string;
    quarterCount: number;
    allSlotsFilled: boolean;
    generationMode: "rule" | "ai-fixed" | "ai-free" | "manual";
  } | null>(null);
  const isInternal = match.matchType === "INTERNAL";
  const [activeSide, setActiveSide] = useState<"A" | "B">("A");
  const [savingTeams, setSavingTeams] = useState(false);
  const [showTeamSplit, setShowTeamSplit] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [guestCardOpen, setGuestCardOpen] = useState(false);

  const { showToast } = useToast();

  /**
   * DB에 저장된 쿼터별 스쿼드 — AI 코치 분석 fallback + 편성 완료 판단 소스.
   * 저장 이벤트가 들어오면 refetch.
   */
  const [dbSquads, setDbSquads] = useState<Array<{
    quarter_number: number;
    formation: string;
    positions: Record<string, { playerId: string; x: number; y: number; secondPlayerId?: string }>;
  }>>([]);
  const [squadsRefetchToken, setSquadsRefetchToken] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/squads?matchId=${encodeURIComponent(matchId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const arr = Array.isArray(d?.squads) ? d.squads : [];
        setDbSquads(arr);
      })
      .catch(() => { /* 실패해도 기본값 유지 */ });
    return () => { cancelled = true; };
  }, [matchId, squadsRefetchToken]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ matchId?: string }>).detail;
      if (!detail || detail.matchId === matchId) {
        setSquadsRefetchToken((n) => n + 1);
      }
    };
    window.addEventListener("match-squads-saved", handler);
    return () => window.removeEventListener("match-squads-saved", handler);
  }, [matchId]);

  /**
   * 편성 완료 판단 — 용병 카드 위치(상단/하단) 전환의 유일한 기준.
   *
   * 규칙: "매 쿼터마다 정규 슬롯이 전부 채워진 스쿼드가 하나라도 있음".
   * - 심판/촬영 같은 메타 슬롯(__ prefix)은 formation template slots에 없어 자연 제외
   * - 자체전(INTERNAL)은 A·B 각각 행이 있는데, 둘 중 하나라도 완전하면 해당 쿼터 완료 인정
   * - 하나 쿼터라도 부분/빈 상태면 편성 미완료 → 용병 카드 상단 유지
   */
  /**
   * 덮어쓰기 confirm 기준 — 편성이 "하나라도" 저장된 상태인지.
   * isFormationComplete 와 다름: 완전히 채워지지 않아도 일부 슬롯만 배치돼 있어도 true.
   */
  const hasAnyExistingSlot = useMemo(() => {
    if (dbSquads.length === 0) return false;
    for (const sq of dbSquads) {
      if (!sq.positions) continue;
      for (const [slotId, pos] of Object.entries(sq.positions)) {
        if (slotId.startsWith("__")) continue; // 심판/촬영 제외
        if (pos && typeof pos === "object" && "playerId" in pos && (pos as { playerId?: string }).playerId) {
          return true;
        }
      }
    }
    return false;
  }, [dbSquads]);

  const isFormationComplete = useMemo(() => {
    if (dbSquads.length === 0) return false;
    const qc = match.quarterCount;
    // quarterCount가 없거나 0·음수면 편성 개념 자체가 성립 안 함 → 미완료
    if (!qc || qc < 1) return false;
    for (let q = 1; q <= qc; q++) {
      const candidates = dbSquads.filter((s) => s.quarter_number === q);
      if (candidates.length === 0) return false;
      const hasComplete = candidates.some((sq) => {
        const tpl = formationTemplates.find((f) => f.id === sq.formation);
        if (!tpl) return false;
        return tpl.slots.every((slot) => !!sq.positions?.[slot.id]?.playerId);
      });
      if (!hasComplete) return false;
    }
    return true;
  }, [dbSquads, match.quarterCount]);

  // AI 코치 분석 DB fallback: AutoFormationBuilder가 계산해 준 context가 없을 때
  // (수동 편집·DB 저장된 편성 복원) 전술판에 실제 배치된 스쿼드로 context를 만든다.
  const dbAiCoachContext = useMemo(() => {
    if (dbSquads.length === 0) return null;

    // playerId → name 매핑 (참석 선수 + 용병)
    const nameMap = new Map<string, string>();
    for (const p of attendingPlayers) nameMap.set(p.id, p.name);
    for (const g of guests ?? []) nameMap.set(g.id, g.name);

    const sortedSquads = [...dbSquads].sort((a, b) => a.quarter_number - b.quarter_number);

    const quarterPlacements: Array<{ quarter: number; assignments: Array<{ slot: string; playerName: string }> }> = [];
    const quarterFormations: Array<{ quarter: number; formation: string }> = [];
    let totalAssignedFieldSlots = 0;

    for (const sq of sortedSquads) {
      const tpl = formationTemplates.find((f) => f.id === sq.formation);
      if (!tpl) continue;
      const assignments: Array<{ slot: string; playerName: string }> = [];
      for (const slot of tpl.slots) {
        const posEntry = sq.positions?.[slot.id];
        if (!posEntry?.playerId) continue;
        // nameMap에 없어도 카운트는 포함 — DB 배치 기준으로 판단 (앱 재진입 후 버튼 활성 유지)
        const playerName = nameMap.get(posEntry.playerId) ?? `선수(${posEntry.playerId.slice(0, 6)})`;
        assignments.push({ slot: slot.label, playerName });
        if (!slot.label.toUpperCase().includes("GK")) totalAssignedFieldSlots++;
      }
      if (assignments.length > 0) {
        quarterPlacements.push({ quarter: sq.quarter_number, assignments });
        quarterFormations.push({ quarter: sq.quarter_number, formation: tpl.name });
      }
    }

    if (quarterPlacements.length === 0) return null;

    // allSlotsFilled: 쿼터 × 필드슬롯 수 = 실제 배정된 필드 슬롯 수
    const firstTpl = formationTemplates.find((f) => f.id === sortedSquads[0].formation);
    const fieldSlotsPerQtr = firstTpl ? firstTpl.slots.length - 1 : 0;
    const expectedTotal = fieldSlotsPerQtr * match.quarterCount;
    const allSlotsFilled = expectedTotal > 0 && totalAssignedFieldSlots >= expectedTotal;

    return {
      placement: quarterPlacements[0].assignments,
      quarterPlacements,
      quarterFormations,
      attendees: [
        ...attendingPlayers.map((p) => ({ name: p.name, preferredPosition: p.preferredPosition, isGuest: p.isGuest ?? false })),
        ...(guests ?? []).map((g) => ({ name: g.name, preferredPosition: null, isGuest: true })),
      ],
      formationName: firstTpl?.name ?? "",
      quarterCount: match.quarterCount,
      allSlotsFilled,
      generationMode: "manual" as const,
    };
  }, [dbSquads, attendingPlayers, guests, match.quarterCount]);

  // 실제 AI 코치 카드에 전달할 최종 context: AutoFormationBuilder 우선, 없으면 DB fallback
  const effectiveAiCoachContext = aiCoachContext ?? dbAiCoachContext;

  /* ── 카드 고정 순서 (숫자 작을수록 위) ──
   *   -10 INTERNAL 팀 편성 (자체전만)
   *   -5  용병 관리 (편성 미완료 — 용병 추가·확인 용이하게 상단)
   *   10  자동 편성 빌더
   *   20  전술판
   *   30  역할 가이드 (전술판 바로 아래)
   *   40  AI 코치 분석
   *   95  용병 관리 (편성 완료 — 준비 끝났으니 하단)
   *
   * "편성 완료" = 매 쿼터마다 정규 슬롯 전부 채워진 스쿼드가 존재.
   * 부분 배치·포메이션만 변경·심판만 지정 같은 케이스는 편성 완료로 치지 않음.
   */
  const guestOrder = isFormationComplete ? 95 : -5;

  // 자체전: 팀별 roster 필터링
  const filteredRoster = isInternal && internalTeams
    ? roster.filter((p) => internalTeams.some((t) => t.playerId === p.id && t.side === activeSide))
    : roster;
  const filteredAttending = isInternal && internalTeams
    ? attendingPlayers.filter((p) => internalTeams.some((t) => t.playerId === p.id && t.side === activeSide))
    : attendingPlayers;

  return (
    <div className="flex flex-col gap-5 min-w-0 overflow-x-hidden">
      {/* 자체전 팀 편성(최상단 고정) */}
      {isInternal && (
        <div style={{ order: -10 }} className="flex flex-col gap-5">
        {(() => {
        const teamMap: Record<string, "A" | "B"> = {};
        for (const t of internalTeams ?? []) teamMap[t.playerId] = t.side;
        const teamACount = Object.values(teamMap).filter((s) => s === "A").length;
        const teamBCount = Object.values(teamMap).filter((s) => s === "B").length;
        const unassignedCount = attendingPlayers.filter((p) => !teamMap[p.id]).length;
        const hasTeams = teamACount > 0 || teamBCount > 0;

        async function assignSide(playerId: string, side: "A" | "B" | null) {
          const newMap = { ...teamMap };
          if (side === null) delete newMap[playerId]; else newMap[playerId] = side;
          setSavingTeams(true);
          await apiMutate("/api/internal-teams", "POST", {
            matchId, teams: { A: Object.entries(newMap).filter(([, s]) => s === "A").map(([id]) => id), B: Object.entries(newMap).filter(([, s]) => s === "B").map(([id]) => id) },
          });
          setSavingTeams(false);
          refetchInternalTeams?.();
        }

        async function handleRandomSplit() {
          const shuffled = [...attendingPlayers].sort(() => Math.random() - 0.5);
          const half = Math.ceil(shuffled.length / 2);
          setSavingTeams(true);
          await apiMutate("/api/internal-teams", "POST", {
            matchId, teams: { A: shuffled.slice(0, half).map((m) => m.id), B: shuffled.slice(half).map((m) => m.id) },
          });
          setSavingTeams(false);
          showToast("랜덤 팀 편성 완료");
          refetchInternalTeams?.();
        }

        return (
          <>
            {/* 팀 편성 */}
            <Card className={cn("rounded-xl", hasTeams ? "border-[hsl(var(--success))]/20" : "border-[hsl(var(--warning))]/20")}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-sm"><Users className="h-4 w-4 text-primary" />팀 편성</span>
                    {unassignedCount > 0 && <span className="text-[hsl(var(--warning))] ml-2 font-medium">미배정 {unassignedCount}명</span>}
                  </div>
                  <div className="flex gap-1.5">
                    {canManage && (
                      <Button size="sm" variant="outline" onClick={handleRandomSplit} disabled={savingTeams || attendingPlayers.length < 2}>
                        {savingTeams ? "..." : "랜덤"}
                      </Button>
                    )}
                    <Button size="sm" variant={showTeamSplit ? "default" : "outline"} onClick={() => setShowTeamSplit(!showTeamSplit)}>
                      {showTeamSplit ? "접기" : "편성"}
                    </Button>
                  </div>
                </div>

                {showTeamSplit && (
                  <div className="max-h-[55vh] overflow-y-auto">
                    {/* 미배정 */}
                    {unassignedCount > 0 && canManage && (
                      <div className="mb-2 p-2 rounded-lg bg-[hsl(var(--warning))]/5 border border-[hsl(var(--warning))]/20">
                        <p className="text-xs font-semibold text-[hsl(var(--warning))] mb-1.5">미배정</p>
                        <div className="flex flex-wrap gap-1">
                          {attendingPlayers.filter((m) => !teamMap[m.id]).map((m) => (
                            <button key={m.id} type="button" disabled={savingTeams}
                              onClick={() => assignSide(m.id, "A")}
                              className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                              {m.name}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">탭하면 A팀으로 배정</p>
                      </div>
                    )}

                    {/* A팀 / B팀 2열 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
                        <p className="text-xs font-bold text-primary mb-1 sticky top-0 bg-[hsl(var(--card))] py-1.5 z-1 border-b border-primary/20">A팀 ({teamACount}명)</p>
                        <div className="space-y-px">
                          {attendingPlayers.filter((m) => teamMap[m.id] === "A").map((m) => (
                            <button key={m.id} type="button" disabled={savingTeams || !canManage}
                              onClick={() => assignSide(m.id, "B")}
                              className="flex w-full items-center rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-[hsl(var(--info))]/15 active:bg-[hsl(var(--info))]/25 transition-colors min-h-[36px]">
                              <span className="truncate">{m.name}</span>
                              {canManage && <span className="ml-auto shrink-0 text-xs text-[hsl(var(--info))]/70">→B</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg border border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/5 p-2">
                        <p className="text-xs font-bold text-[hsl(var(--info))] mb-1 sticky top-0 bg-[hsl(var(--card))] py-1.5 z-1 border-b border-[hsl(var(--info))]/20">B팀 ({teamBCount}명)</p>
                        <div className="space-y-px">
                          {attendingPlayers.filter((m) => teamMap[m.id] === "B").map((m) => (
                            <button key={m.id} type="button" disabled={savingTeams || !canManage}
                              onClick={() => assignSide(m.id, "A")}
                              className="flex w-full items-center rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-primary/15 active:bg-primary/25 transition-colors min-h-[36px]">
                              <span className="truncate">{m.name}</span>
                              {canManage && <span className="ml-auto shrink-0 text-xs text-primary/70">→A</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 접힌 상태에서 요약 */}
                {!showTeamSplit && hasTeams && (
                  <div className="flex items-center justify-center gap-4 py-1 text-sm font-semibold">
                    <span className="text-primary">A팀 {teamACount}명</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="text-[hsl(var(--info))]">B팀 {teamBCount}명</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* A/B 탭 토글 */}
            {hasTeams && (
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => { setActiveSide("A"); setGeneratedSquads([]); setTacticsKey((k) => k + 1); }}
                  className={cn("flex-1 min-h-[44px] rounded-lg border px-4 text-sm font-bold transition-colors",
                    activeSide === "A" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                  )}>
                  A팀 ({teamACount}명)
                </button>
                <button type="button"
                  onClick={() => { setActiveSide("B"); setGeneratedSquads([]); setTacticsKey((k) => k + 1); }}
                  className={cn("flex-1 min-h-[44px] rounded-lg border px-4 text-sm font-bold transition-colors",
                    activeSide === "B" ? "border-[hsl(var(--info))] bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]" : "border-border text-muted-foreground hover:border-[hsl(var(--info))]/30"
                  )}>
                  B팀 ({teamBCount}명)
                </button>
              </div>
            )}

            {/* 편성 안 됐으면 안내 */}
            {!hasTeams && !showTeamSplit && (
              <Card className="border-[hsl(var(--warning))]/20 bg-[hsl(var(--warning))]/5">
                <CardContent className="p-4 text-sm text-[hsl(var(--warning))] text-center">
                  위 &quot;편성&quot; 버튼으로 A/B팀을 먼저 나눠주세요.
                </CardContent>
              </Card>
            )}
          </>
        );
        })()}
        </div>
      )}

      {/* ── 용병 관리 (아코디언) — 용병 있고 편성 전이면 상단, 아니면 하단 ── */}
      {canManage && (
        <div style={{ order: guestOrder }} className="rounded-xl border border-border/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setGuestCardOpen(!guestCardOpen)}
            className="flex w-full items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors"
          >
            <span className="flex items-center gap-2 text-base font-bold">
              <Users className="h-4 w-4 text-primary" />
              용병
              <Badge variant="secondary" className="text-xs">{(guests ?? []).length}명</Badge>
            </span>
            <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200", guestCardOpen && "rotate-180")} />
          </button>

          {!guestCardOpen && (
            <div className="px-5 pb-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                {(guests ?? []).length === 0
                  ? "등록된 용병이 없습니다."
                  : (guests ?? []).map((g) => g.name).slice(0, 4).join(", ") + ((guests ?? []).length > 4 ? " 외" : "")}
              </p>
              <Button
                size="sm"
                className="w-full gap-2 rounded-lg"
                onClick={(e) => { e.stopPropagation(); setGuestCardOpen(true); }}
              >
                <Plus className="h-4 w-4" />
                용병 {(guests ?? []).length === 0 ? "등록" : "관리"}
              </Button>
            </div>
          )}

          {guestCardOpen && (
          <>
          <div className="flex items-center justify-end px-5 pb-3">
            <Button
              type="button"
              size="sm"
              variant={showGuestForm ? "outline" : "default"}
              onClick={() => setShowGuestForm(!showGuestForm)}
              className="gap-1"
            >
              {showGuestForm ? "닫기" : (<><Plus className="h-4 w-4" />추가</>)}
            </Button>
          </div>
          <div className="space-y-4 px-5 pb-5">
            {showGuestForm && (
              <form action={async (formData) => {
                const name = String(formData.get("guestName") || "").trim();
                if (!name) return;
                const positions = formData.getAll("guestPositions").map(String).filter(Boolean);
                const phone = String(formData.get("guestPhone") || "") || undefined;
                const note = String(formData.get("guestNote") || "") || undefined;
                await apiMutate("/api/guests", "POST", { matchId, name, position: positions.join(",") || null, phone, note });
                setShowGuestForm(false);
                refetchGuests?.();
              }} className="space-y-4 rounded-xl bg-secondary/30 p-4">
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">이름 <span className="text-destructive">*</span></p>
                  <input name="guestName" required placeholder="용병 이름" className="h-12 w-full rounded-xl border-0 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-medium text-muted-foreground">선호 포지션 (복수 선택)</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(["GK","CB","LB","RB","CDM","CM","CAM","LW","RW","ST"] as const).map((pos) => (
                      <label key={pos} className="flex cursor-pointer items-center gap-2 rounded-lg bg-background px-3 py-2.5">
                        <input type="checkbox" name="guestPositions" value={pos} className="h-4 w-4 rounded border-border accent-primary" />
                        <span className="text-sm font-medium">{pos}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">연락처</p>
                  <PhoneInput name="guestPhone" />
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">메모</p>
                  <input name="guestNote" placeholder="소속팀, 실력 등" className="h-12 w-full rounded-xl border-0 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl">용병 등록</Button>
              </form>
            )}
            {(guests ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">등록된 용병이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {(guests ?? []).map((g) => {
                  const isEditing = editingGuestId === g.id;
                  const existingPositions = (g.position ?? "")
                    .split(",")
                    .map((p) => p.trim())
                    .filter(Boolean);
                  return (
                    <li key={g.id} className="rounded-xl bg-secondary/30 p-3">
                      {isEditing ? (
                        <form
                          action={async (formData) => {
                            const name = String(formData.get("editName") || "").trim();
                            if (!name) return;
                            const positions = formData.getAll("editPositions").map(String).filter(Boolean);
                            const phone = String(formData.get("editPhone") || "") || undefined;
                            const note = String(formData.get("editNote") || "") || undefined;
                            const { error } = await apiMutate("/api/guests", "PUT", {
                              id: g.id,
                              name,
                              position: positions.join(",") || null,
                              phone,
                              note,
                            });
                            if (error) {
                              showToast("수정 실패: " + error, "error");
                              return;
                            }
                            showToast("용병 정보가 수정되었습니다.");
                            setEditingGuestId(null);
                            refetchGuests?.();
                          }}
                          className="space-y-3"
                        >
                          <div>
                            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                              이름 <span className="text-destructive">*</span>
                            </p>
                            <input
                              name="editName"
                              required
                              defaultValue={g.name}
                              placeholder="용병 이름"
                              className="h-11 w-full rounded-xl border-0 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <p className="mb-2 text-[11px] font-medium text-muted-foreground">선호 포지션 (복수 선택)</p>
                            <div className="grid grid-cols-4 gap-2">
                              {(["GK","CB","LB","RB","CDM","CM","CAM","LW","RW","ST"] as const).map((pos) => (
                                <label key={pos} className="flex cursor-pointer items-center gap-2 rounded-lg bg-background px-3 py-2">
                                  <input
                                    type="checkbox"
                                    name="editPositions"
                                    value={pos}
                                    defaultChecked={existingPositions.includes(pos)}
                                    className="h-4 w-4 rounded border-border accent-primary"
                                  />
                                  <span className="text-sm font-medium">{pos}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">연락처</p>
                            <PhoneInput name="editPhone" defaultValue={g.phone ?? ""} />
                          </div>
                          <div>
                            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">메모</p>
                            <input
                              name="editNote"
                              defaultValue={g.note ?? ""}
                              placeholder="소속팀, 실력 등"
                              className="h-11 w-full rounded-xl border-0 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" size="sm" className="flex-1 rounded-xl">저장</Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-xl"
                              onClick={() => setEditingGuestId(null)}
                            >
                              취소
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">{g.name}</p>
                            {g.position && (
                              <div className="flex flex-wrap gap-1">
                                {existingPositions.map((pos) => (
                                  <Badge key={pos} variant="secondary" className="text-[10px] px-1.5 py-0">{pos}</Badge>
                                ))}
                              </div>
                            )}
                            {(g.phone || g.note) && (
                              <p className="text-xs text-muted-foreground">{[g.phone ? formatPhone(g.phone) : "", g.note].filter(Boolean).join(" · ")}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingGuestId(g.id)}
                              title="수정"
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveGuest?.(g.id)}
                              title="삭제"
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          </>
          )}
        </div>
      )}

      {canManage && (
        <div style={{ order: 10 }}>
          <AutoFormationBuilder
            matchId={matchId}
            quarterCount={match.quarterCount}
            attendingPlayers={filteredAttending}
            sportType={sportType}
            playerCount={match.playerCount}
            defaultFormationId={defaultFormationId}
            side={isInternal ? activeSide : undefined}
            hasExistingFormation={hasAnyExistingSlot}
            initialSquads={dbSquads}
            onGenerated={(squads) => {
              setGeneratedSquads(squads);
              setTacticsKey((k) => k + 1);
              scrollToTacticsBoard();
            }}
            onAnalysisContextReady={setAiCoachContext}
            enableAi={enableAi}
            matchContext={{
              matchType: (match.matchType ?? "REGULAR"),
              opponent: match.opponent ?? null,
            }}
          />
        </div>
      )}

      <div
        ref={tacticsRef}
        style={{ order: 20 }}
        className={cn(
          "scroll-mt-20 rounded-xl transition-all duration-500",
          tacticsHighlight && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
      >
        <TacticsBoard
          key={`${tacticsKey}-${activeSide}`}
          matchId={matchId}
          roster={filteredRoster}
          quarterCount={match.quarterCount}
          sportType={sportType}
          playerCount={match.playerCount}
          defaultFormationId={defaultFormationId}
          readOnly={!canManage}
          side={isInternal ? activeSide : undefined}
          teamSettings={teamSettings}
          initialSquads={generatedSquads.length > 0 ? generatedSquads.map((sq) => ({
            id: `gen-${sq.quarter_number}`,
            match_id: matchId,
            quarter_number: sq.quarter_number,
            formation: sq.formation,
            positions: sq.positions,
          })) : undefined}
        />
      </div>

      {/* AI 코치 분석 — 항상 렌더, 전술판 채움 여부로 버튼 활성화 제어 */}
      {canManage && (
        <div style={{ order: 40 }}>
          <AiCoachAnalysisCard
            allSlotsFilled={effectiveAiCoachContext?.allSlotsFilled ?? false}
            placement={effectiveAiCoachContext?.placement ?? []}
            quarterPlacements={effectiveAiCoachContext?.quarterPlacements}
            quarterFormations={effectiveAiCoachContext?.quarterFormations}
            generationMode={effectiveAiCoachContext?.generationMode}
            attendees={effectiveAiCoachContext?.attendees ?? []}
            formationName={effectiveAiCoachContext?.formationName ?? ""}
            quarterCount={effectiveAiCoachContext?.quarterCount ?? match.quarterCount}
            matchType={(match.matchType ?? "REGULAR") as "REGULAR" | "INTERNAL" | "EVENT"}
            opponent={match.opponent ?? null}
            matchId={matchId}
            enableAi={enableAi}
          />
        </div>
      )}

      {/* 역할 가이드 — 전술판 바로 아래 (회원 우선순위 고려) */}
      <div style={{ order: 30 }}>
        <MatchRoleGuide
          matchId={matchId}
          canManage={canManage}
          currentUserId={currentUserId}
          currentMemberId={currentMemberId}
          currentMemberAttended={currentMemberAttended}
          attendingPlayers={attendingPlayers}
          guests={guests ?? []}
          defaultFormationId={defaultFormationId}
          sportType={sportType}
          playerCount={match.playerCount}
        />
      </div>
    </div>
  );
}

export const MatchTacticsTab = memo(MatchTacticsTabInner);
