"use client";

/**
 * MemberEditModal — 회원 카드 펼침의 5개 인라인 편집기를 통합한 모달
 *
 * 펼침 영역은 정보 표시만 두고, 편집 액션은 [수정] 버튼 → 모달로 분리.
 * 모바일에서 회원 카드 펼쳐도 길어지지 않게.
 *
 * 섹션 (권한별 노출):
 *  1. 등번호 (본인 또는 STAFF+)
 *  2. 감독 지정 포지션 (STAFF+)
 *  3. 주장·부주장 (STAFF+)
 *  4. 역할 변경 (PRESIDENT, 본인 제외)
 *  5. 휴면 처리 / 휴면 해제 (PRESIDENT, 본인 제외)
 *
 * 핸들러는 부모(MembersClient)에서 props로 전달 — confirm·refetch 로직 재사용.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

interface MemberLite {
  id: string;
  name: string;
  role: Role;
  status: string;
  jerseyNumber: number | null;
  coachPositions: string[];
  teamRole: string | null;
  dormantType: string | null;
  dormantUntil: string | null;
  dormantReason: string | null;
}

export interface MemberEditModalProps {
  open: boolean;
  onClose: () => void;
  member: MemberLite | null;
  positions: string[]; // 종목별 포지션 목록 (예: 축구 11인제 10개)
  // 권한 플래그
  isSelf: boolean;
  isStaffOrAbove: boolean;
  canChangeRole: boolean;
  canKick: boolean;
  // 핸들러 (저장 시 부모가 apiMutate + refetch 처리)
  onSaveJersey: (memberId: string, value: number | null) => Promise<void>;
  onSaveCoachPositions: (memberId: string, positions: string[]) => Promise<void>;
  onTeamRoleChange: (memberId: string, role: string | null) => Promise<void>;
  onRoleChange: (memberId: string, role: Role) => Promise<void>;
  onSetDormant: (memberId: string, type: string, until: string, reason: string) => Promise<void>;
  onUnsetDormant: (memberId: string) => Promise<void>;
}

const DORMANT_OPTIONS = [
  { value: "INJURED", label: "🏥 부상" },
  { value: "PERSONAL", label: "✈️ 개인사정" },
  { value: "OTHER", label: "❓ 기타" },
];

export function MemberEditModal({
  open,
  onClose,
  member,
  positions,
  isSelf,
  isStaffOrAbove,
  canChangeRole,
  canKick,
  onSaveJersey,
  onSaveCoachPositions,
  onTeamRoleChange,
  onRoleChange,
  onSetDormant,
  onUnsetDormant,
}: MemberEditModalProps) {
  const [mounted, setMounted] = useState(false);
  const [jerseyValue, setJerseyValue] = useState("");
  const [coachPos, setCoachPos] = useState<string[]>([]);
  const [dormantType, setDormantType] = useState("INJURED");
  const [dormantUntil, setDormantUntil] = useState("");
  const [dormantReason, setDormantReason] = useState("");
  const [savingSection, setSavingSection] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // 모달 열릴 때 member 정보로 state 초기화 + dirty 비교용 초기 snapshot 저장
  const initialSnapshotRef = useRef<string>("");
  useEffect(() => {
    if (!open || !member) return;
    const jersey = member.jerseyNumber !== null ? String(member.jerseyNumber) : "";
    const cpos = member.coachPositions;
    const dType = member.dormantType || "INJURED";
    const dUntil = member.dormantUntil || "";
    const dReason = member.dormantReason || "";
    setJerseyValue(jersey);
    setCoachPos(cpos);
    setDormantType(dType);
    setDormantUntil(dUntil);
    setDormantReason(dReason);
    initialSnapshotRef.current = JSON.stringify({ jersey, cpos, dType, dUntil, dReason });
  }, [open, member]);

  // 미저장 변경 시 페이지 이탈 경고
  const dirty = (() => {
    if (!open || !initialSnapshotRef.current) return false;
    return initialSnapshotRef.current !== JSON.stringify({
      jersey: jerseyValue,
      cpos: coachPos,
      dType: dormantType,
      dUntil: dormantUntil,
      dReason: dormantReason,
    });
  })();
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // body scroll lock + ESC
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!mounted || !open || !member) return null;

  const canEditJersey = isSelf || isStaffOrAbove;
  const canEditCoach = isStaffOrAbove;
  const canEditTeamRole = isStaffOrAbove;
  const canEditRole = canChangeRole && !isSelf;
  const canSetDormant = canKick && !isSelf;
  const isDormant = member.status === "DORMANT";

  async function withSaving<T>(section: string, fn: () => Promise<T>) {
    setSavingSection(section);
    try {
      await fn();
    } finally {
      setSavingSection(null);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex w-full max-h-[90vh] flex-col overflow-hidden rounded-t-2xl bg-background shadow-2xl sm:rounded-2xl"
        style={{ maxWidth: "min(100vw, 480px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-border/40">
          <div>
            <h2 className="text-base font-bold leading-tight">{member.name} 회원 정보 수정</h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              필요한 항목만 수정하고 각 섹션의 [저장] 버튼을 누르세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="-mr-1 -mt-1 shrink-0 rounded-full p-2 hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* 1. 등번호 */}
          {canEditJersey && (
            <section className="space-y-2">
              <Label className="text-sm font-semibold">등번호</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={999}
                  value={jerseyValue}
                  onChange={(e) => setJerseyValue(e.target.value)}
                  placeholder="번호 (선택)"
                  className="w-28 text-sm"
                />
                <Button
                  size="sm"
                  disabled={savingSection === "jersey"}
                  onClick={() =>
                    withSaving("jersey", async () => {
                      const num = jerseyValue.trim() === "" ? null : Number(jerseyValue);
                      await onSaveJersey(member.id, num);
                    })
                  }
                >
                  {savingSection === "jersey" ? "저장 중..." : "저장"}
                </Button>
              </div>
            </section>
          )}

          {/* 2. 감독 지정 포지션 */}
          {canEditCoach && (
            <section className="space-y-2">
              <Label className="text-sm font-semibold">감독 지정 포지션</Label>
              <p className="text-[12px] text-muted-foreground">
                자동 편성·라인업 추천에 반영됩니다 (복수 선택 가능).
              </p>
              <div className="flex flex-wrap gap-1.5">
                {positions.map((pos) => {
                  const selected = coachPos.includes(pos);
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() =>
                        setCoachPos((prev) =>
                          selected ? prev.filter((p) => p !== pos) : [...prev, pos]
                        )
                      }
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                      )}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>
              <Button
                size="sm"
                disabled={savingSection === "coach"}
                onClick={() => withSaving("coach", () => onSaveCoachPositions(member.id, coachPos))}
              >
                {savingSection === "coach" ? "저장 중..." : "포지션 저장"}
              </Button>
            </section>
          )}

          {/* 3. 주장·부주장 */}
          {canEditTeamRole && (
            <section className="space-y-2">
              <Label className="text-sm font-semibold">주장 · 부주장</Label>
              <Select
                value={member.teamRole ?? "NONE"}
                onValueChange={(v) =>
                  withSaving("teamRole", () => onTeamRoleChange(member.id, v === "NONE" ? null : v))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">역할 없음</SelectItem>
                  <SelectItem value="CAPTAIN">주장</SelectItem>
                  <SelectItem value="VICE_CAPTAIN">부주장</SelectItem>
                </SelectContent>
              </Select>
            </section>
          )}

          {/* 4. 역할 변경 (PRESIDENT 전용, 본인 제외) */}
          {canEditRole && (
            <section className="space-y-2">
              <Label className="text-sm font-semibold">팀 권한</Label>
              <Select
                value={member.role}
                onValueChange={(v) => withSaving("role", () => onRoleChange(member.id, v as Role))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESIDENT">회장</SelectItem>
                  <SelectItem value="STAFF">운영진</SelectItem>
                  <SelectItem value="MEMBER">평회원</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11.5px] text-muted-foreground">
                회장 이임 시 본인은 자동으로 운영진으로 변경됩니다.
              </p>
            </section>
          )}

          {/* 5. 휴면 처리 */}
          {canSetDormant && (
            <section className="space-y-2 rounded-xl border border-border/60 bg-secondary/30 p-3">
              <Label className="text-sm font-semibold">
                {isDormant ? "휴면 회원" : "휴면 처리"}
              </Label>
              {isDormant ? (
                <>
                  <p className="text-[12.5px] text-muted-foreground">
                    {member.dormantType ? `사유: ${DORMANT_OPTIONS.find((o) => o.value === member.dormantType)?.label ?? "휴면"}` : ""}
                    {member.dormantUntil ? ` · 복귀: ${member.dormantUntil}` : ""}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingSection === "unsetDormant"}
                    onClick={() => withSaving("unsetDormant", () => onUnsetDormant(member.id))}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    활동 회원으로 복귀
                  </Button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[12px] text-muted-foreground">사유</Label>
                      <NativeSelect value={dormantType} onChange={(e) => setDormantType(e.target.value)} className="h-9 text-sm">
                        {DORMANT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[12px] text-muted-foreground">복귀 예정일 (선택)</Label>
                      <Input type="date" value={dormantUntil} onChange={(e) => setDormantUntil(e.target.value)} className="h-9 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[12px] text-muted-foreground">메모 (선택)</Label>
                    <Input value={dormantReason} onChange={(e) => setDormantReason(e.target.value)} placeholder="예: 무릎 인대 부상" className="h-9 text-sm" />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingSection === "setDormant"}
                    onClick={() =>
                      withSaving("setDormant", () =>
                        onSetDormant(member.id, dormantType, dormantUntil, dormantReason)
                      )
                    }
                  >
                    {savingSection === "setDormant" ? "처리 중..." : "휴면 처리"}
                  </Button>
                </>
              )}
            </section>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border/40 shrink-0">
          <Button onClick={onClose} variant="outline" className="w-full">
            닫기
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
