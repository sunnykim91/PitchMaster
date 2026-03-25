"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
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

type TeamSettingsData = {
  teamName: string;
  logoUrl: string;
  inviteCode: string;
  uniformPrimary: string;
  uniformSecondary: string;
  uniformPattern: "SOLID" | "STRIPES_VERTICAL" | "STRIPES_HORIZONTAL" | "STRIPES_DIAGONAL";
  isSearchable: boolean;
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
      setMessage(`오류: ${error}`);
    } else {
      setTeam({ ...team, isSearchable: newVal });
      setMessage(newVal ? "팀 검색이 허용되었습니다." : "팀 검색이 비허용되었습니다.");
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
        setMessage(`오류: ${json.error || "처리 실패"}`);
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
    });
    setSaving(false);
    if (error) {
      setMessage(`오류: ${error}`);
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
              <Label className="text-sm font-semibold text-muted-foreground">팀 로고 URL</Label>
              <Input
                value={team.logoUrl}
                onChange={(event) => setTeam({ ...team, logoUrl: event.target.value })}
                placeholder="https://..."
                disabled={!canEditTeam}
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

            {/* 유니폼 */}
            <div className="rounded-xl border border-border p-4 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">유니폼</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-muted-foreground">홈 색상</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={uniformPrimary}
                      onChange={(event) => setTeam({ ...team, uniformPrimary: event.target.value })}
                      disabled={!canEditTeam}
                      className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-input bg-transparent p-0.5"
                    />
                    <Input
                      value={uniformPrimary}
                      onChange={(event) => setTeam({ ...team, uniformPrimary: event.target.value })}
                      disabled={!canEditTeam}
                      className="flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-muted-foreground">원정 색상</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={uniformSecondary}
                      onChange={(event) => setTeam({ ...team, uniformSecondary: event.target.value })}
                      disabled={!canEditTeam}
                      className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-input bg-transparent p-0.5"
                    />
                    <Input
                      value={uniformSecondary}
                      onChange={(event) => setTeam({ ...team, uniformSecondary: event.target.value })}
                      disabled={!canEditTeam}
                      className="flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-muted-foreground">패턴</Label>
                <Select
                  value={uniformPattern}
                  onValueChange={(value) => setTeam({ ...team, uniformPattern: value as TeamSettingsData["uniformPattern"] })}
                  disabled={!canEditTeam}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOLID">단색</SelectItem>
                    <SelectItem value="STRIPES_VERTICAL">세로 스트라이프</SelectItem>
                    <SelectItem value="STRIPES_HORIZONTAL">가로 스트라이프</SelectItem>
                    <SelectItem value="STRIPES_DIAGONAL">대각 스트라이프</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-6 pt-2">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-14 w-14 rounded-lg border border-border shadow-sm" style={homeJerseyStyle} />
                  <span className="text-xs font-medium text-muted-foreground">홈</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-14 w-14 rounded-lg border border-border shadow-sm" style={awayJerseyStyle} />
                  <span className="text-xs font-medium text-muted-foreground">원정</span>
                </div>
              </div>
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
