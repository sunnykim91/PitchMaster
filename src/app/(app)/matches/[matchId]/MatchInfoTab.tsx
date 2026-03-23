"use client";

import { memo, useMemo, useState } from "react";
import { apiMutate } from "@/lib/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn, formatPhone } from "@/lib/utils";
import { PhoneInput } from "@/components/ui/phone-input";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Bell } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import type {
  Match,
  Guest,
  RosterPlayer,
} from "./matchDetailTypes";
import { voteStyles as styles } from "./matchDetailTypes";

export interface MatchInfoTabProps {
  matchId: string;
  userId: string;
  match: Match;
  canManage: boolean;
  baseRoster: RosterPlayer[];
  memberVoteMap: Record<string, "ATTEND" | "ABSENT" | "MAYBE">;
  guests: Guest[];
  /** 참석투표 refetch */
  refetchVote: () => Promise<unknown>;
  /** 게스트 refetch */
  refetchGuests: () => Promise<unknown>;
  /** 경기 목록 refetch (경기 완료 처리 시) */
  refetchMatches: () => Promise<unknown>;
  /** 대리 투표 */
  handleProxyVote: (memberId: string, vote: "ATTEND" | "ABSENT" | "MAYBE") => Promise<void>;
  /** 용병 삭제 */
  handleRemoveGuest: (guestId: string) => Promise<void>;
}

function MatchInfoTabInner({
  matchId,
  userId,
  match,
  canManage,
  baseRoster,
  memberVoteMap,
  guests,
  refetchVote,
  refetchGuests,
  refetchMatches,
  handleProxyVote,
  handleRemoveGuest,
}: MatchInfoTabProps) {
  const { showToast } = useToast();

  /* ── 경기 완료 처리 ── */
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);

  /** 경기 날짜가 오늘 이전 또는 오늘인지 확인 (KST 기준) */
  const isMatchDatePastOrToday = useMemo(() => {
    if (!match.date) return false;
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayStr = kstNow.toISOString().split("T")[0];
    return match.date <= todayStr;
  }, [match.date]);

  async function handleCompleteMatch() {
    setCompleting(true);
    try {
      await apiMutate("/api/matches", "PUT", { id: matchId, status: "COMPLETED" });
      showToast("경기가 완료 처리되었습니다.");
      await refetchMatches();
    } catch {
      showToast("경기 완료 처리에 실패했습니다.", "error");
    } finally {
      setCompleting(false);
      setShowCompleteConfirm(false);
    }
  }

  /* ── 내 참석 투표 ── */
  async function handleMyVote(vote: "ATTEND" | "ABSENT" | "MAYBE") {
    const { error: err } = await apiMutate("/api/attendance", "POST", { matchId, vote });
    if (err) {
      showToast("투표에 실패했습니다. 다시 시도해주세요.", "error");
    } else {
      await refetchVote();
    }
  }

  /* ── 용병 관리 ── */
  const [isGuestFormOpen, setIsGuestFormOpen] = useState(false);
  const [voteSearch, setVoteSearch] = useState("");

  async function handleAddGuest(formData: FormData) {
    const name = String(formData.get("guestName") || "").trim();
    if (!name) return;
    const positions = formData.getAll("guestPositions").map(String).filter(Boolean);
    const position = positions.length > 0 ? positions.join(",") : undefined;
    const phone = String(formData.get("guestPhone") || "") || undefined;
    const note = String(formData.get("guestNote") || "") || undefined;

    await apiMutate("/api/guests", "POST", {
      matchId,
      name,
      position,
      phone,
      note,
    });
    setIsGuestFormOpen(false);
    await refetchGuests();
  }

  return (
    <>
      {/* ── 경기 완료 처리 (운영진 이상, SCHEDULED + 경기일 오늘 이전/오늘) ── */}
      {canManage && match.status === "SCHEDULED" && isMatchDatePastOrToday && (
        <Card className="border-[hsl(var(--success))]/20 bg-[hsl(var(--success))]/5">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">경기를 완료 처리하시겠습니까?</p>
              <p className="text-xs text-muted-foreground">완료 처리하면 전적과 기록에 반영됩니다.</p>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              disabled={completing}
              onClick={() => setShowCompleteConfirm(true)}
            >
              {completing ? "처리 중..." : "경기 완료"}
            </Button>
          </CardContent>
        </Card>
      )}
      <ConfirmDialog
        open={showCompleteConfirm}
        title="경기 완료 처리"
        description="이 경기를 완료 상태로 변경합니다. 완료된 경기의 기록만 시즌 전적에 반영됩니다."
        confirmLabel="완료 처리"
        cancelLabel="취소"
        onConfirm={handleCompleteMatch}
        onCancel={() => setShowCompleteConfirm(false)}
      />

      {/* ── 내 참석 투표 (모든 멤버, 진행 전 경기만) ── */}
      {match.status !== "COMPLETED" && (() => {
        const myMember = baseRoster.find((m) => m.id === userId);
        if (!myMember) return null;
        const myVote = memberVoteMap[myMember.memberId];
        return (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground">내 참석 투표</p>
                  <p className="mt-1 text-sm font-semibold">
                    {myVote === "ATTEND" ? "참석" : myVote === "ABSENT" ? "불참" : myVote === "MAYBE" ? "미정" : "미투표"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {([
                    { value: "ATTEND" as const, label: "참석" },
                    { value: "MAYBE" as const, label: "미정" },
                    { value: "ABSENT" as const, label: "불참" },
                  ]).map((opt) => {
                    const isSelected = myVote === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={cn(
                          "rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          isSelected ? styles[opt.value].active : styles[opt.value].inactive
                        )}
                        onClick={() => handleMyVote(opt.value)}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* ── 참석투표 관리 (운영진 이상, 진행 전 경기만) ── */}
      {canManage && match.status !== "COMPLETED" && (
        <Card>
          <CardHeader>
            <p className="type-overline text-[hsl(var(--info))]">
              Attendance
            </p>
            <CardTitle className="mt-1 font-heading text-lg sm:text-xl font-bold uppercase">
              참석 투표 관리
            </CardTitle>
            <p className="text-xs text-muted-foreground">멤버별 참석/불참/미정을 대리 설정할 수 있습니다.</p>
            <input
              type="text"
              placeholder="이름 검색..."
              value={voteSearch}
              onChange={(e) => setVoteSearch(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {/* 투표 현황 카운터 */}
            {(() => {
              const attend = baseRoster.filter((m) => memberVoteMap[m.memberId] === "ATTEND").length;
              const absent = baseRoster.filter((m) => memberVoteMap[m.memberId] === "ABSENT").length;
              const maybe = baseRoster.filter((m) => memberVoteMap[m.memberId] === "MAYBE").length;
              const noVote = baseRoster.length - attend - absent - maybe;
              return (
                <>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                    <span className="text-[hsl(var(--success))]">참석 {attend}</span>
                    <span className="text-[hsl(var(--loss))]">불참 {absent}</span>
                    <span className="text-[hsl(var(--warning))]">미정 {maybe}</span>
                    <span className="text-muted-foreground">미투표 {noVote}</span>
                    <span className="text-muted-foreground/50">· 총 {baseRoster.length}명</span>
                  </div>
                  {noVote > 0 && (
                    <button
                      type="button"
                      className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/push/vote-nudge", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ matchId: match.id }),
                          });
                          const data = await res.json();
                          alert(`미투표자 ${data.unvoted ?? 0}명에게 알림을 보냈습니다`);
                        } catch {
                          alert("알림 발송에 실패했습니다");
                        }
                      }}
                    >
                      <Bell className="h-3.5 w-3.5" />
                      투표독려 알림 보내기
                    </button>
                  )}
                </>
              );
            })()}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...baseRoster].filter((m) => !voteSearch || m.name.includes(voteSearch)).sort((a, b) => {
                const voteA = memberVoteMap[a.memberId];
                const voteB = memberVoteMap[b.memberId];
                const order: Record<string, number> = { ATTEND: 0, MAYBE: 1, ABSENT: 2 };
                const orderA = voteA ? (order[voteA] ?? 3) : 4;
                const orderB = voteB ? (order[voteB] ?? 3) : 4;
                return orderA - orderB;
              }).map((member) => {
                const currentVote = memberVoteMap[member.memberId];
                return (
                  <div key={member.id} className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold truncate">{member.name}</span>
                      {!member.isLinked && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">미가입</Badge>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {([
                        { value: "ATTEND" as const, label: "참석" },
                        { value: "MAYBE" as const, label: "미정" },
                        { value: "ABSENT" as const, label: "불참" },
                      ]).map((opt) => {
                        const isSelected = currentVote === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            className={cn(
                              "rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                              isSelected ? styles[opt.value].active : styles[opt.value].inactive
                            )}
                            onClick={() => handleProxyVote(member.memberId, opt.value)}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 참석 현황 (모든 회원, 운영진 투표 관리가 없을 때) ── */}
      {!canManage && match.status !== "COMPLETED" && baseRoster.length > 0 && (() => {
        const attend = baseRoster.filter((m) => memberVoteMap[m.memberId] === "ATTEND");
        const absent = baseRoster.filter((m) => memberVoteMap[m.memberId] === "ABSENT");
        const maybe = baseRoster.filter((m) => memberVoteMap[m.memberId] === "MAYBE");
        const noVote = baseRoster.filter((m) => !memberVoteMap[m.memberId]);
        return (
          <Card>
            <CardHeader>
              <CardTitle className="mt-1 font-heading text-lg sm:text-xl font-bold uppercase">
                참석 현황
              </CardTitle>
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                <span className="text-[hsl(var(--success))]">참석 {attend.length}</span>
                <span className="text-[hsl(var(--loss))]">불참 {absent.length}</span>
                <span className="text-[hsl(var(--warning))]">미정 {maybe.length}</span>
                <span className="text-muted-foreground">미투표 {noVote.length}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attend.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-[hsl(var(--success))]">참석</p>
                    <div className="flex flex-wrap gap-1.5">
                      {attend.map((m) => (
                        <span key={m.id} className="rounded-full bg-[hsl(var(--success)/0.1)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--success))]">{m.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {maybe.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-[hsl(var(--warning))]">미정</p>
                    <div className="flex flex-wrap gap-1.5">
                      {maybe.map((m) => (
                        <span key={m.id} className="rounded-full bg-[hsl(var(--warning)/0.1)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--warning))]">{m.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {absent.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-[hsl(var(--loss))]">불참</p>
                    <div className="flex flex-wrap gap-1.5">
                      {absent.map((m) => (
                        <span key={m.id} className="rounded-full bg-[hsl(var(--loss)/0.1)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--loss))]">{m.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {noVote.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-muted-foreground">미투표</p>
                    <div className="flex flex-wrap gap-1.5">
                      {noVote.map((m) => (
                        <span key={m.id} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">{m.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* ── 용병(게스트) 관리 (운영진 이상) ── */}
      {canManage && (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <p className="type-overline text-[hsl(var(--accent))]">
              Guests
            </p>
            <CardTitle className="mt-1 font-heading text-lg sm:text-xl font-bold uppercase">
              용병 관리
            </CardTitle>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsGuestFormOpen((prev) => !prev)}
          >
            {isGuestFormOpen ? "닫기" : "용병 등록"}
          </Button>
        </CardHeader>

        <CardContent>
          {isGuestFormOpen && (
            <form
              className="mb-4"
              action={(formData) => handleAddGuest(formData)}
            >
              <Card className="border-0 bg-secondary shadow-none">
                <CardContent className="p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        이름 *
                      </Label>
                      <Input name="guestName" required placeholder="홍길동" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <fieldset>
                        <legend className="text-xs font-semibold text-muted-foreground mb-1">선호 포지션 (복수 선택)</legend>
                        <div className="flex flex-wrap gap-2">
                          {(["GK","CB","LB","RB","CDM","CAM","LW","RW","ST"] as const).map((pos) => (
                            <label key={pos} className="flex items-center gap-1 text-xs cursor-pointer">
                              <input type="checkbox" name="guestPositions" value={pos} className="rounded" id={`guest-pos-${pos}`} />
                              {pos}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        연락처
                      </Label>
                      <PhoneInput name="guestPhone" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        메모
                      </Label>
                      <Input name="guestNote" placeholder="소속팀, 실력 등" />
                    </div>
                  </div>
                  <Button type="submit" className="mt-3 w-full" size="sm">
                    등록
                  </Button>
                </CardContent>
              </Card>
            </form>
          )}

          {guests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              등록된 용병이 없습니다. 용병을 등록하면 전술판과 골 기록에서 선택할 수 있습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {guests.map((guest) => (
                <Card
                  key={guest.id}
                  className="border-0 bg-secondary shadow-none"
                >
                  <CardContent className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold truncate">
                        {guest.name}
                        {guest.position && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {guest.position}
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[guest.phone ? formatPhone(guest.phone) : "", guest.note].filter(Boolean).join(" · ") || "용병"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveGuest(guest.id)}
                      className="min-h-[36px] min-w-[36px] rounded px-2 text-xs text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      삭제
                    </button>
                  </CardContent>
                </Card>
              ))}
              <p className="text-xs text-muted-foreground">
                총 {guests.length}명의 용병이 등록되었습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </>
  );
}

export const MatchInfoTab = memo(MatchInfoTabInner);
