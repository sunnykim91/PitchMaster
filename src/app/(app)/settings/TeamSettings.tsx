"use client";

import { memo, useMemo } from "react";
import type { FormEvent } from "react";
import { apiMutate } from "@/lib/useApi";
import { isPresident } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TeamSettingsData = {
  teamName: string;
  logoUrl: string;
  inviteCode: string;
  uniformPrimary: string;
  uniformSecondary: string;
  uniformPattern: "SOLID" | "STRIPES_VERTICAL" | "STRIPES_HORIZONTAL" | "STRIPES_DIAGONAL";
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

function getUniformStyle(primary: string, secondary: string, pattern: string) {
  if (pattern === "STRIPES_VERTICAL") {
    return {
      backgroundColor: primary,
      backgroundImage: `repeating-linear-gradient(90deg, ${primary} 0 10px, ${secondary} 10px 20px)`,
    };
  }
  if (pattern === "STRIPES_HORIZONTAL") {
    return {
      backgroundColor: primary,
      backgroundImage: `repeating-linear-gradient(180deg, ${primary} 0 10px, ${secondary} 10px 20px)`,
    };
  }
  if (pattern === "STRIPES_DIAGONAL") {
    return {
      backgroundColor: primary,
      backgroundImage: `repeating-linear-gradient(135deg, ${primary} 0 10px, ${secondary} 10px 20px)`,
    };
  }
  return { backgroundColor: primary };
}

function getJerseyStyle(primary: string, secondary: string, pattern: string) {
  return {
    ...getUniformStyle(primary, secondary, pattern),
    clipPath:
      "polygon(12% 12%, 30% 12%, 34% 0%, 66% 0%, 70% 12%, 88% 12%, 100% 34%, 86% 48%, 86% 100%, 14% 100%, 14% 48%, 0% 34%)",
    borderRadius: "8px",
  } as const;
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
                <Input value={team.inviteCode} readOnly className="font-mono tracking-wider" />
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

            {/* 유니폼 */}
            <div className="rounded-xl border border-border/50 p-4 space-y-4">
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
                  <span className="text-[11px] font-medium text-muted-foreground">홈</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-14 w-14 rounded-lg border border-border shadow-sm" style={awayJerseyStyle} />
                  <span className="text-[11px] font-medium text-muted-foreground">원정</span>
                </div>
              </div>
            </div>

            {canEditTeam && (
              <Button type="submit" size="sm" disabled={saving} className="w-full sm:w-auto">
                {saving ? "저장 중..." : "저장"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

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
