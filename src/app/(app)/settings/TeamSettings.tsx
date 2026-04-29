"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { apiMutate } from "@/lib/useApi";
import { isPresident, isStaffOrAbove } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getUniformStyle, getJerseyStyle } from "@/lib/uniformUtils";
import { cn } from "@/lib/utils";
import { toKoreanError } from "@/lib/errorMessages";
import TeamLogo from "@/components/TeamLogo";
import { Camera, X } from "lucide-react";

type UniformPattern = "SOLID" | "STRIPES_VERTICAL" | "STRIPES_HORIZONTAL" | "STRIPES_DIAGONAL";
type UniformSet = { primary: string; secondary: string; pattern: UniformPattern };
type UniformsData = { home: UniformSet; away: UniformSet; third?: UniformSet | null };

export type TeamSettingsData = {
  teamName: string;
  logoUrl: string;
  inviteCode: string;
  uniformPrimary: string;
  uniformSecondary: string;
  uniformPattern: UniformPattern;
  uniforms?: UniformsData | null;
  isSearchable: boolean;
  joinMode: "AUTO" | "MANUAL";
  defaultFormationId: string;
  statsRecordingStaffOnly: boolean;
  mvpVoteStaffOnly: boolean;
  sportType?: "SOCCER" | "FUTSAL";
  defaultPlayerCount?: number;
};

type JoinRequest = {
  id: string;
  name: string;
  phone: string | null;
  position: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

interface TeamSettingsProps {
  team: TeamSettingsData;
  setTeam: (team: TeamSettingsData) => void;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  setMessage: (msg: string | null) => void;
  refetchTeam: () => void;
  teamSyncedRef: React.MutableRefObject<boolean>;
  role?: Role;
  deleteConfirmName: string;
  setDeleteConfirmName: (name: string) => void;
  onDeleteTeam: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}


function TeamSettingsComponent({
  team,
  setTeam,
  saving,
  setSaving,
  setMessage,
  refetchTeam,
  teamSyncedRef,
  role,
  deleteConfirmName,
  setDeleteConfirmName,
  onDeleteTeam,
}: TeamSettingsProps) {
  const canEditTeam = isPresident(role);
  const canManageRequests = isStaffOrAbove(role);

  const uniformPrimary = team.uniformPrimary ?? "#2563eb";
  const uniformSecondary = team.uniformSecondary ?? "#f97316";
  const uniformPattern = team.uniformPattern ?? "SOLID";

  // useMemo로 jerseyStyle 연산 캐싱 (H2)
  const homeJerseyStyle = useMemo(
    () => getJerseyStyle(uniformPrimary, uniformSecondary, uniformPattern),
    [uniformPrimary, uniformSecondary, uniformPattern]
  );
  const awayJerseyStyle = useMemo(
    () => getJerseyStyle(uniformSecondary, uniformPrimary, uniformPattern),
    [uniformPrimary, uniformSecondary, uniformPattern]
  );

  // ── 검색 허용 토글 ──
  const [searchableLoading, setSearchableLoading] = useState(false);

  async function handleToggleSearchable() {
    if (!canEditTeam) return;
    setSearchableLoading(true);
    const newVal = !team.isSearchable;
    const { error } = await apiMutate("/api/teams", "PUT", { isSearchable: newVal });
    setSearchableLoading(false);
    if (error) {
      setMessage(toKoreanError(String(error)));
    } else {
      setTeam({ ...team, isSearchable: newVal });
      setMessage(newVal ? "팀 검색이 허용되었습니다." : "팀 검색이 비허용되었습니다.");
      teamSyncedRef.current = false;
      await refetchTeam();
    }
    setTimeout(() => setMessage(null), 2000);
  }

  // ── MVP 투표 권한 토글 (운영진 이상만) ──
  const [mvpVoteLoading, setMvpVoteLoading] = useState(false);

  async function handleToggleMvpVoteStaffOnly() {
    if (!canEditTeam) return;
    setMvpVoteLoading(true);
    const newVal = !team.mvpVoteStaffOnly;
    const { error } = await apiMutate("/api/teams", "PUT", { mvpVoteStaffOnly: newVal });
    setMvpVoteLoading(false);
    if (error) {
      setMessage(toKoreanError(String(error)));
    } else {
      setTeam({ ...team, mvpVoteStaffOnly: newVal });
      setMessage(
        newVal
          ? "이제 운영진만 MVP 투표를 할 수 있습니다."
          : "모든 참석 회원이 MVP 투표를 할 수 있습니다."
      );
      teamSyncedRef.current = false;
      await refetchTeam();
    }
    setTimeout(() => setMessage(null), 2500);
  }

  // ── 경기 기록 권한 토글 (운영진 이상만) ──
  const [statsRecordingLoading, setStatsRecordingLoading] = useState(false);

  async function handleToggleStatsRecordingStaffOnly() {
    if (!canEditTeam) return;
    setStatsRecordingLoading(true);
    const newVal = !team.statsRecordingStaffOnly;
    const { error } = await apiMutate("/api/teams", "PUT", { statsRecordingStaffOnly: newVal });
    setStatsRecordingLoading(false);
    if (error) {
      setMessage(toKoreanError(String(error)));
    } else {
      setTeam({ ...team, statsRecordingStaffOnly: newVal });
      setMessage(
        newVal
          ? "이제 운영진만 경기 기록을 입력할 수 있습니다."
          : "모든 회원이 경기 기록을 입력할 수 있습니다."
      );
      teamSyncedRef.current = false;
      await refetchTeam();
    }
    setTimeout(() => setMessage(null), 2500);
  }

  // ── 가입 모드 토글 ──
  const [joinModeLoading, setJoinModeLoading] = useState(false);

  async function handleToggleJoinMode() {
    if (!canEditTeam) return;
    setJoinModeLoading(true);
    const newVal = team.joinMode === "MANUAL" ? "AUTO" : "MANUAL";
    const { error } = await apiMutate("/api/teams", "PUT", { joinMode: newVal });
    setJoinModeLoading(false);
    if (error) {
      setMessage(toKoreanError(String(error)));
    } else {
      setTeam({ ...team, joinMode: newVal });
      setMessage(newVal === "MANUAL" ? "가입 시 승인이 필요합니다." : "가입 시 자동 승인됩니다.");
      teamSyncedRef.current = false;
      await refetchTeam();
    }
    setTimeout(() => setMessage(null), 2000);
  }

  // ── 가입 신청 관리 ──
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchJoinRequests = useCallback(async () => {
    if (!canManageRequests) return;
    setRequestsLoading(true);
    try {
      const res = await fetch("/api/teams/join-requests", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setPendingRequests(
          (json.requests ?? []).filter((r: JoinRequest) => r.status === "PENDING")
        );
      }
    } catch {
      // ignore
    } finally {
      setRequestsLoading(false);
    }
  }, [canManageRequests]);

  useEffect(() => {
    fetchJoinRequests();
  }, [fetchJoinRequests]);

  async function handleRequestAction(reqId: string, action: "APPROVED" | "REJECTED") {
    setProcessingId(reqId);
    try {
      const res = await fetch(`/api/teams/join-requests/${reqId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(toKoreanError(json.error || "처리 실패"));
      } else {
        setMessage(action === "APPROVED" ? "가입 신청이 승인되었습니다." : "가입 신청이 거절되었습니다.");
        await fetchJoinRequests();
      }
    } catch {
      setMessage("오류: 네트워크 오류");
    }
    setProcessingId(null);
    setTimeout(() => setMessage(null), 2000);
  }

  async function handleTeamSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEditTeam) return;
    setSaving(true);
    const { error } = await apiMutate("/api/teams", "PUT", {
      name: team.teamName,
      logoUrl: team.logoUrl,
      uniformPrimary: team.uniformPrimary,
      uniformSecondary: team.uniformSecondary,
      uniformPattern: team.uniformPattern,
      uniforms: team.uniforms,
      defaultFormationId: team.defaultFormationId || null,
      defaultPlayerCount: team.defaultPlayerCount ?? undefined,
    });
    setSaving(false);
    if (error) {
      setMessage(toKoreanError(String(error)));
    } else {
      setMessage("팀 설정이 저장되었습니다.");
      teamSyncedRef.current = false;
      await refetchTeam();
    }
    setTimeout(() => setMessage(null), 2000);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">팀 설정</CardTitle>
            {!canEditTeam && (
              <Badge variant="secondary" className="text-xs">회장만 수정 가능</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleTeamSubmit} className="space-y-5">
            {/* 기본 정보 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-muted-foreground">팀명</Label>
                <Input
                  value={team.teamName}
                  onChange={(event) => setTeam({ ...team, teamName: event.target.value })}
                  disabled={!canEditTeam}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-muted-foreground">초대 코드</Label>
                <Input value={team.inviteCode} readOnly className="font-mono tracking-wider bg-secondary/50 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-muted-foreground">팀 로고</Label>
              <LogoUpload
                logoUrl={team.logoUrl}
                teamName={team.teamName}
                disabled={!canEditTeam}
                onSaved={async (url) => {
                  setTeam({ ...team, logoUrl: url });
                  await apiMutate("/api/teams", "PUT", { logoUrl: url });
                  teamSyncedRef.current = false;
                  await refetchTeam();
                  // 세션 갱신을 위해 router.refresh (서버 컴포넌트 재실행)
                  window.location.reload();
                }}
              />
            </div>

            {/* 검색 허용 토글 */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">팀 검색 허용</p>
                  <p className="text-xs text-muted-foreground">
                    허용하면 다른 사용자가 팀을 검색하고 가입 신청할 수 있습니다.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={team.isSearchable}
                  disabled={!canEditTeam || searchableLoading}
                  onClick={handleToggleSearchable}
                  className={`
                    relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
                    transition-colors duration-200 ease-in-out
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                    disabled:cursor-not-allowed disabled:opacity-50
                    ${team.isSearchable ? "bg-primary" : "bg-muted"}
                  `}
                >
                  <span
                    className={`
                      pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg
                      ring-0 transition-transform duration-200 ease-in-out
                      ${team.isSearchable ? "translate-x-5" : "translate-x-0.5"}
                    `}
                  />
                </button>
              </div>
            </div>

            {/* 가입 승인 모드 */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">가입 승인 필요</p>
                  <p className="text-xs text-muted-foreground">
                    {team.joinMode === "MANUAL"
                      ? "초대링크/팀검색 가입 시 운영진 승인이 필요합니다."
                      : "초대링크/팀검색 가입 시 즉시 가입됩니다."}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={team.joinMode === "MANUAL"}
                  disabled={!canEditTeam || joinModeLoading}
                  onClick={handleToggleJoinMode}
                  className={`
                    relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
                    transition-colors duration-200 ease-in-out
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                    disabled:cursor-not-allowed disabled:opacity-50
                    ${team.joinMode === "MANUAL" ? "bg-primary" : "bg-muted"}
                  `}
                >
                  <span
                    className={`
                      pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg
                      ring-0 transition-transform duration-200 ease-in-out
                      ${team.joinMode === "MANUAL" ? "translate-x-5" : "translate-x-0.5"}
                    `}
                  />
                </button>
              </div>
            </div>

            {/* MVP 투표 권한 (운영진 이상만) */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">MVP 투표는 운영진만</p>
                  <p className="text-xs text-muted-foreground">
                    {team.mvpVoteStaffOnly
                      ? "운영진이 MVP를 직접 지정합니다. 평회원은 투표 결과를 볼 수만 있습니다."
                      : "참석한 모든 회원이 MVP 투표에 참여할 수 있습니다."}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={team.mvpVoteStaffOnly}
                  disabled={!canEditTeam || mvpVoteLoading}
                  onClick={handleToggleMvpVoteStaffOnly}
                  className={`
                    relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
                    transition-colors duration-200 ease-in-out
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                    disabled:cursor-not-allowed disabled:opacity-50
                    ${team.mvpVoteStaffOnly ? "bg-primary" : "bg-muted"}
                  `}
                >
                  <span
                    className={`
                      pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg
                      ring-0 transition-transform duration-200 ease-in-out
                      ${team.mvpVoteStaffOnly ? "translate-x-5" : "translate-x-0.5"}
                    `}
                  />
                </button>
              </div>
            </div>

            {/* 경기 기록 권한 (운영진 이상만) */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">경기 기록은 운영진만</p>
                  <p className="text-xs text-muted-foreground">
                    {team.statsRecordingStaffOnly
                      ? "골/어시 기록은 운영진 이상만 입력할 수 있습니다. 평회원은 기록을 보기만 합니다."
                      : "모든 회원이 골/어시 기록을 자유롭게 입력할 수 있습니다."}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={team.statsRecordingStaffOnly}
                  disabled={!canEditTeam || statsRecordingLoading}
                  onClick={handleToggleStatsRecordingStaffOnly}
                  className={`
                    relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
                    transition-colors duration-200 ease-in-out
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                    disabled:cursor-not-allowed disabled:opacity-50
                    ${team.statsRecordingStaffOnly ? "bg-primary" : "bg-muted"}
                  `}
                >
                  <span
                    className={`
                      pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg
                      ring-0 transition-transform duration-200 ease-in-out
                      ${team.statsRecordingStaffOnly ? "translate-x-5" : "translate-x-0.5"}
                    `}
                  />
                </button>
              </div>
            </div>

            {/* 유니폼 — 홈/원정/써드 탭 */}
            <UniformSettings
              uniforms={team.uniforms ?? {
                home: { primary: team.uniformPrimary || "#2563eb", secondary: team.uniformSecondary || "#f97316", pattern: team.uniformPattern || "SOLID" },
                away: { primary: team.uniformSecondary || "#f97316", secondary: team.uniformPrimary || "#2563eb", pattern: team.uniformPattern || "SOLID" },
              }}
              onChange={(uniforms) => {
                setTeam({
                  ...team,
                  uniforms,
                  uniformPrimary: uniforms.home.primary,
                  uniformSecondary: uniforms.home.secondary,
                  uniformPattern: uniforms.home.pattern,
                });
              }}
              disabled={!canEditTeam}
            />

            {/* 기본 참가 인원 */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">기본 참가 인원</p>
              <p className="text-xs text-muted-foreground">
                새 경기 등록 시 자동 적용됩니다. 경기별로 개별 변경 가능.
              </p>
              {(() => {
                // sportType이 명시되지 않거나 잘못 들어온 케이스 방어:
                // defaultPlayerCount 가 6 이하면 풋살, 8 이상이면 축구로 보정 추정
                const isFutsal =
                  team.sportType === "FUTSAL" ||
                  (team.sportType !== "SOCCER" &&
                    team.defaultPlayerCount !== undefined &&
                    team.defaultPlayerCount > 0 &&
                    team.defaultPlayerCount <= 6);
                const options = isFutsal ? [3, 4, 5, 6] : [8, 9, 10, 11];
                const fallbackValue = isFutsal ? 6 : 11;
                return (
                  <Select
                    value={String(team.defaultPlayerCount ?? fallbackValue)}
                    onValueChange={(v) => setTeam({ ...team, defaultPlayerCount: Number(v) })}
                    disabled={!canEditTeam}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}:{n} (GK 포함 {n}명)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })()}
            </div>

            {/* 기본 포메이션 */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">기본 포메이션</p>
              <p className="text-xs text-muted-foreground">자동 편성과 전술판에서 기본으로 사용됩니다.</p>
              <Select
                value={team.defaultFormationId || "__none__"}
                onValueChange={(v) => {
                  const val = v === "__none__" ? "" : v;
                  setTeam({ ...team, defaultFormationId: val });
                }}
                disabled={!canEditTeam}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="선택 안 함" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">선택 안 함</SelectItem>
                  <SelectItem value="4-4-2">4-4-2</SelectItem>
                  <SelectItem value="4-2-3-1">4-2-3-1</SelectItem>
                  <SelectItem value="4-3-3">4-3-3</SelectItem>
                  <SelectItem value="3-5-2">3-5-2</SelectItem>
                  <SelectItem value="3-4-3">3-4-3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {canEditTeam && (
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "저장 중..." : "저장"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* ── 가입 신청 관리 ── */}
      {canManageRequests && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">가입 신청</p>
              {pendingRequests.length > 0 && (
                <Badge variant="secondary">{pendingRequests.length}건 대기</Badge>
              )}
            </div>

            {requestsLoading ? (
              <p className="text-sm text-muted-foreground">로딩 중...</p>
            ) : pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">대기 중인 가입 신청이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{req.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {req.position && `${req.position}`}
                        {req.position && req.message && " · "}
                        {req.message && `"${req.message}"`}
                        {(req.position || req.message) && " · "}
                        {timeAgo(req.created_at)}
                      </p>
                    </div>
                    <div className="ml-3 flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        disabled={processingId === req.id}
                        onClick={() => handleRequestAction(req.id, "APPROVED")}
                      >
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={processingId === req.id}
                        onClick={() => handleRequestAction(req.id, "REJECTED")}
                      >
                        거절
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 팀 삭제 ── */}
      {canEditTeam && (
        <Card className="border-[hsl(var(--loss))]/20">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-bold text-[hsl(var(--loss))]">팀 삭제</p>
            <p className="text-sm text-muted-foreground">
              팀을 삭제하면 모든 경기, 회비, 기록이 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <p className="text-sm text-muted-foreground">
              삭제하려면 팀 이름 <span className="font-bold text-foreground">{team.teamName}</span>을 입력하세요.
            </p>
            <Input
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="팀 이름 입력"
            />
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteConfirmName !== team.teamName}
              onClick={onDeleteTeam}
              className="w-full"
            >
              팀 영구 삭제
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export const TeamSettings = memo(TeamSettingsComponent);

/* ── UniformSettings sub-component ── */

const PRESET_COLORS = [
  { label: "검정", value: "#000000" },
  { label: "흰색", value: "#FFFFFF" },
  { label: "빨강", value: "#DC2626" },
  { label: "파랑", value: "#2563EB" },
  { label: "초록", value: "#16A34A" },
  { label: "주황", value: "#EA580C" },
  { label: "노랑", value: "#EAB308" },
  { label: "보라", value: "#7C3AED" },
  { label: "하늘", value: "#38BDF8" },
  { label: "분홍", value: "#EC4899" },
];

const PATTERN_OPTIONS: { value: UniformPattern; label: string }[] = [
  { value: "SOLID", label: "단색" },
  { value: "STRIPES_VERTICAL", label: "세로 스트라이프" },
  { value: "STRIPES_HORIZONTAL", label: "가로 스트라이프" },
  { value: "STRIPES_DIAGONAL", label: "대각 스트라이프" },
];

function UniformSettings({
  uniforms,
  onChange,
  disabled,
}: {
  uniforms: UniformsData;
  onChange: (u: UniformsData) => void;
  disabled: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"home" | "away" | "third">("home");

  const currentSet: UniformSet = activeTab === "third"
    ? (uniforms.third ?? { primary: "#000000", secondary: "#FFFFFF", pattern: "SOLID" })
    : uniforms[activeTab];

  const updateCurrent = (partial: Partial<UniformSet>) => {
    const updated = { ...currentSet, ...partial };
    if (activeTab === "third") {
      onChange({ ...uniforms, third: updated });
    } else {
      onChange({ ...uniforms, [activeTab]: updated });
    }
  };

  const hasThird = !!uniforms.third;

  const addThird = () => {
    onChange({ ...uniforms, third: { primary: "#000000", secondary: "#FFFFFF", pattern: "SOLID" } });
    setActiveTab("third");
  };

  const removeThird = () => {
    const { third: _, ...rest } = uniforms;
    onChange(rest as UniformsData);
    setActiveTab("home");
  };

  const jerseyStyle = getJerseyStyle(currentSet.primary, currentSet.secondary, currentSet.pattern);

  return (
    <div className="rounded-xl border border-border p-4 space-y-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">유니폼</p>

      {/* 탭: 홈 | 원정 | 써드 */}
      <div className="flex gap-2">
        {(["home", "away"] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className={cn("flex-1 rounded-lg py-2 text-sm font-medium transition-all",
              activeTab === tab ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}>
            {tab === "home" ? "홈" : "원정"}
          </button>
        ))}
        {hasThird ? (
          <button type="button" onClick={() => setActiveTab("third")}
            className={cn("flex-1 rounded-lg py-2 text-sm font-medium transition-all",
              activeTab === "third" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}>
            써드
          </button>
        ) : (
          <button type="button" onClick={addThird} disabled={disabled}
            className="flex-1 rounded-lg border border-dashed border-border py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all">
            + 써드 추가
          </button>
        )}
      </div>

      {/* 미리보기 */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-16 w-16 rounded-lg" style={{ ...jerseyStyle, filter: "drop-shadow(0 0 1.5px hsl(var(--foreground) / 0.35))" }} />
          <span className="text-xs font-medium text-muted-foreground">
            {activeTab === "home" ? "홈" : activeTab === "away" ? "원정" : "써드"}
          </span>
        </div>
      </div>

      {/* 프리셋 색상 */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">메인 색상</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button key={c.value} type="button" disabled={disabled}
              onClick={() => updateCurrent({ primary: c.value })}
              className={cn("h-8 w-8 rounded-full border-2 transition-all",
                currentSet.primary === c.value ? "border-primary scale-110" : "border-border hover:scale-105"
              )}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
          <input type="color" value={currentSet.primary} disabled={disabled}
            onChange={(e) => updateCurrent({ primary: e.target.value })}
            className="h-8 w-8 cursor-pointer rounded-full border-2 border-border p-0.5"
            title="직접 선택"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">서브 색상</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button key={c.value} type="button" disabled={disabled}
              onClick={() => updateCurrent({ secondary: c.value })}
              className={cn("h-8 w-8 rounded-full border-2 transition-all",
                currentSet.secondary === c.value ? "border-primary scale-110" : "border-border hover:scale-105"
              )}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
          <input type="color" value={currentSet.secondary} disabled={disabled}
            onChange={(e) => updateCurrent({ secondary: e.target.value })}
            className="h-8 w-8 cursor-pointer rounded-full border-2 border-border p-0.5"
            title="직접 선택"
          />
        </div>
      </div>

      {/* 패턴 */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">패턴</p>
        <div className="grid grid-cols-4 gap-2">
          {PATTERN_OPTIONS.map((p) => (
            <button key={p.value} type="button" disabled={disabled}
              onClick={() => updateCurrent({ pattern: p.value })}
              className={cn("rounded-lg border p-2 text-center text-xs font-medium transition-all",
                currentSet.pattern === p.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 써드 삭제 */}
      {activeTab === "third" && hasThird && (
        <button type="button" onClick={removeThird} disabled={disabled}
          className="w-full rounded-lg py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
          써드 유니폼 삭제
        </button>
      )}
    </div>
  );
}

/* ── LogoUpload sub-component (with crop) ── */

import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

/** canvas에서 크롭된 이미지를 Blob으로 추출 */
async function getCroppedBlob(src: string, crop: Area): Promise<Blob> {
  const img = new window.Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = src; });
  const canvas = document.createElement("canvas");
  const size = 512; // 정사각형 512px
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, size, size);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/webp", 0.85));
}

function LogoUpload({
  logoUrl,
  teamName,
  disabled,
  onSaved,
}: {
  logoUrl: string;
  teamName: string;
  disabled: boolean;
  onSaved: (url: string) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // 크롭 상태
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("5MB 이하의 이미지만 업로드 가능합니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleCropConfirm() {
    if (!imageSrc || !croppedArea) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea);
      const fd = new FormData();
      fd.append("file", new File([blob], "logo.webp", { type: "image/webp" }));
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const json = await res.json();
      if (json.url) {
        setImageSrc(null);
        await onSaved(json.url);
      }
    } catch {
      alert("업로드에 실패했습니다.");
    }
    setUploading(false);
  }

  async function handleRemove() {
    setUploading(true);
    await onSaved("");
    setUploading(false);
  }

  // 크롭 모달
  if (imageSrc) {
    return (
      <div className="space-y-3">
        <div className="relative h-64 w-full overflow-hidden rounded-xl bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_croppedArea, croppedAreaPixels) => setCroppedArea(croppedAreaPixels)}
          />
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            disabled={uploading}
            onClick={handleCropConfirm}
            className="flex-1"
          >
            {uploading ? "저장 중..." : "이 영역으로 저장"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setImageSrc(null)}
          >
            취소
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <TeamLogo logoUrl={logoUrl || null} teamName={teamName} size="lg" />
      <div className="flex flex-col gap-1.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
          className="gap-1.5"
        >
          <Camera className="h-3.5 w-3.5" />
          {uploading ? "저장 중..." : logoUrl ? "로고 변경" : "로고 등록"}
        </Button>
        {logoUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || uploading}
            onClick={handleRemove}
            className="gap-1.5 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
            로고 삭제
          </Button>
        )}
      </div>
    </div>
  );
}
