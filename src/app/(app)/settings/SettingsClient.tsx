"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, ChevronUp, Calendar, Bell } from "lucide-react";
import { subscribeToPush } from "@/lib/pushSubscription";
import { useApi, apiMutate } from "@/lib/useApi";
import type { PreferredPosition, PreferredFoot, Role } from "@/lib/types";
import { POSITION_GROUPS, PREF_POSITION_LABEL, PREF_POSITION_SHORT } from "@/lib/types";
import { isPresident, isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatPhone, stripPhone } from "@/lib/utils";

type Season = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

function mapSeasonRaw(raw: Record<string, unknown>): Season {
  return {
    id: String(raw.id),
    name: String(raw.name),
    startDate: String(raw.start_date),
    endDate: String(raw.end_date),
    isActive: Boolean(raw.is_active),
  };
}

type Profile = {
  name: string;
  phone: string;
  preferredPositions: PreferredPosition[];
  preferredFoot: PreferredFoot;
  profileImageUrl: string;
};

type TeamSettings = {
  teamName: string;
  logoUrl: string;
  inviteCode: string;
  uniformPrimary: string;
  uniformSecondary: string;
  uniformPattern: "SOLID" | "STRIPES_VERTICAL" | "STRIPES_HORIZONTAL" | "STRIPES_DIAGONAL";
};

type ProfileApiResponse = {
  profile: {
    id: string;
    name: string;
    phone: string;
    preferred_positions: PreferredPosition[];
    preferred_foot: PreferredFoot;
    profile_image_url: string;
  };
};

type TeamApiResponse = {
  team: {
    name: string;
    logo_url: string;
    invite_code: string;
    uniform_primary: string;
    uniform_secondary: string;
    uniform_pattern: TeamSettings["uniformPattern"];
  };
};

function mapProfileResponse(res: ProfileApiResponse): Profile {
  const p = res.profile;
  return {
    name: p.name ?? "",
    phone: p.phone ?? "",
    preferredPositions: p.preferred_positions ?? [],
    preferredFoot: p.preferred_foot ?? "RIGHT",
    profileImageUrl: p.profile_image_url ?? "",
  };
}

function mapTeamResponse(res: TeamApiResponse, fallback: TeamSettings): TeamSettings {
  const t = res.team;
  return {
    teamName: t.name ?? fallback.teamName,
    logoUrl: t.logo_url ?? fallback.logoUrl,
    inviteCode: t.invite_code ?? fallback.inviteCode,
    uniformPrimary: t.uniform_primary ?? fallback.uniformPrimary,
    uniformSecondary: t.uniform_secondary ?? fallback.uniformSecondary,
    uniformPattern: t.uniform_pattern ?? fallback.uniformPattern,
  };
}

type InitialData = {
  profile: Record<string, unknown> | null;
  team: Record<string, unknown> | null;
};

export default function SettingsClient({
  sessionProfile,
  sessionTeam,
  userRole,
  initialData,
}: {
  sessionProfile: Profile;
  sessionTeam: TeamSettings;
  userRole?: Role;
  initialData?: InitialData;
}) {
  const router = useRouter();
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);

  // Merge SSR initialData with session fallback for defaults
  const defaultProfile = useMemo((): Profile => {
    const p = initialData?.profile;
    if (p) {
      return {
        name: (p.name as string) ?? sessionProfile.name,
        phone: (p.phone as string) ?? sessionProfile.phone,
        preferredPositions: (p.preferred_positions as PreferredPosition[]) ?? sessionProfile.preferredPositions,
        preferredFoot: (p.preferred_foot as PreferredFoot) ?? sessionProfile.preferredFoot,
        profileImageUrl: (p.profile_image_url as string) ?? sessionProfile.profileImageUrl,
      };
    }
    return sessionProfile;
  }, [initialData, sessionProfile]);

  const defaultTeam = useMemo((): TeamSettings => {
    const t = initialData?.team;
    if (t) {
      return {
        teamName: (t.name as string) ?? sessionTeam.teamName,
        logoUrl: (t.logo_url as string) ?? sessionTeam.logoUrl,
        inviteCode: (t.invite_code as string) ?? sessionTeam.inviteCode,
        uniformPrimary: (t.uniform_primary as string) ?? sessionTeam.uniformPrimary,
        uniformSecondary: (t.uniform_secondary as string) ?? sessionTeam.uniformSecondary,
        uniformPattern: (t.uniform_pattern as TeamSettings["uniformPattern"]) ?? sessionTeam.uniformPattern,
      };
    }
    return sessionTeam;
  }, [initialData, sessionTeam]);

  const hasInitialData = Boolean(initialData?.profile && initialData?.team);

  // --- Fetch profile from API ---
  const {
    data: profileApiData,
    loading: profileLoading,
    refetch: refetchProfile,
  } = useApi<ProfileApiResponse>("/api/profile", {
    profile: {
      id: "",
      name: defaultProfile.name,
      phone: defaultProfile.phone,
      preferred_positions: defaultProfile.preferredPositions,
      preferred_foot: defaultProfile.preferredFoot,
      profile_image_url: defaultProfile.profileImageUrl,
    },
  }, { skip: hasInitialData });

  // --- Fetch team from API ---
  const {
    data: teamApiData,
    loading: teamLoading,
    refetch: refetchTeam,
  } = useApi<TeamApiResponse>("/api/teams", {
    team: {
      name: defaultTeam.teamName,
      logo_url: defaultTeam.logoUrl,
      invite_code: defaultTeam.inviteCode,
      uniform_primary: defaultTeam.uniformPrimary,
      uniform_secondary: defaultTeam.uniformSecondary,
      uniform_pattern: defaultTeam.uniformPattern,
    },
  }, { skip: hasInitialData });

  // --- Local form state (editable) ---
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [team, setTeam] = useState<TeamSettings>(defaultTeam);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pushLoading, setPushLoading] = useState(false);

  // Sync fetched API data into local form state when it arrives
  const profileSynced = useRef(false);
  const teamSynced = useRef(false);

  useEffect(() => {
    if (!profileLoading && profileApiData.profile.id && !profileSynced.current) {
      profileSynced.current = true;
      setProfile(mapProfileResponse(profileApiData));
    }
  }, [profileLoading, profileApiData]);

  useEffect(() => {
    if (!teamLoading && teamApiData.team.name && !teamSynced.current) {
      teamSynced.current = true;
      setTeam(mapTeamResponse(teamApiData, defaultTeam));
    }
  }, [teamLoading, teamApiData, defaultTeam]);

  const uniformPrimary = team.uniformPrimary ?? "#2563eb";
  const uniformSecondary = team.uniformSecondary ?? "#f97316";
  const uniformPattern = team.uniformPattern ?? "SOLID";

  const ready = !profileLoading && !teamLoading;
  const canEditTeam = isPresident(role);
  const canManageSeasons = isStaffOrAbove(role);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const { error } = await apiMutate("/api/profile", "PUT", {
      name: profile.name,
      phone: profile.phone,
      preferredPositions: profile.preferredPositions,
      preferredFoot: profile.preferredFoot,
      profileImageUrl: profile.profileImageUrl,
    });
    setSaving(false);
    if (error) {
      setMessage(`오류: ${error}`);
    } else {
      setMessage("프로필 설정이 저장되었습니다.");
      profileSynced.current = false;
      await refetchProfile();
    }
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
      teamSynced.current = false;
      await refetchTeam();
    }
    setTimeout(() => setMessage(null), 2000);
  }

  // 알림 설정 로드
  useEffect(() => {
    fetch("/api/notification-settings")
      .then((r) => r.json())
      .then((j) => { if (j.settings) setPushEnabled(j.settings.push ?? true); })
      .catch(() => {});
  }, []);

  async function handlePushToggle() {
    const next = !pushEnabled;
    setPushLoading(true);
    try {
      if (next) {
        const hasSW = "serviceWorker" in navigator;
        const hasPM = "PushManager" in window;
        const hasNoti = typeof Notification !== "undefined";
        if (!hasSW || !hasPM || !hasNoti) {
          setMessage("홈 화면에 추가(앱 설치) 후 푸시 알림을 사용할 수 있습니다");
          setPushLoading(false);
          setTimeout(() => setMessage(null), 4000);
          return;
        }

        const sub = await subscribeToPush();
        if (!sub) {
          setMessage("알림 권한이 거부되었습니다. 브라우저 설정에서 알림을 허용해주세요");
          setPushLoading(false);
          setTimeout(() => setMessage(null), 4000);
          return;
        }
      }
      await fetch("/api/notification-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ push: next }),
      });
      setPushEnabled(next);
      setMessage(next ? "푸시 알림이 활성화되었습니다" : "푸시 알림이 비활성화되었습니다");
    } catch {
      setMessage("알림 설정 변경에 실패했습니다");
    }
    setPushLoading(false);
    setTimeout(() => setMessage(null), 2000);
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/login");
  }

  async function handleDeleteTeam() {
    if (!canEditTeam) return;
    try {
      await fetch("/api/teams", { method: "DELETE" });
    } catch {
      // ignore
    }
    router.push("/login");
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

  if (!ready) {
    return (
      <div className="grid gap-5 stagger-children">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-5 w-32" />
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-5 stagger-children">
      {message && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary animate-in fade-in duration-200">
          {message}
        </div>
      )}

      {/* ── 개인 설정 ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {profile.profileImageUrl ? (
                <img src={profile.profileImageUrl} alt="프로필" className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/20" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {profile.name?.charAt(0) || "?"}
                </div>
              )}
              <div>
                <CardTitle className="text-lg font-bold">개인 설정</CardTitle>
                <p className="text-xs text-muted-foreground">프로필 및 알림을 관리합니다</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={handleLogout}>
              로그아웃
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            {/* 기본 정보 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">이름</Label>
                <Input
                  value={profile.name}
                  onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">연락처</Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={formatPhone(profile.phone)}
                  onChange={(event) => setProfile({ ...profile, phone: stripPhone(event.target.value) })}
                />
              </div>
            </div>

            {/* 플레이 스타일 */}
            <div className="rounded-xl border border-border/50 p-4 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">플레이 스타일</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">주발</Label>
                  <Select value={profile.preferredFoot} onValueChange={(value) => setProfile({ ...profile, preferredFoot: value as PreferredFoot })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RIGHT">오른발</SelectItem>
                      <SelectItem value="LEFT">왼발</SelectItem>
                      <SelectItem value="BOTH">양발</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">선호 포지션</Label>
                <div className="space-y-3">
                  {POSITION_GROUPS.map((group) => (
                    <div key={group.group}>
                      <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground/70">{group.group}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.positions.map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => {
                              const next = profile.preferredPositions.includes(pos)
                                ? profile.preferredPositions.filter((p) => p !== pos)
                                : [...profile.preferredPositions, pos];
                              setProfile({ ...profile, preferredPositions: next });
                            }}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs font-medium transition-all active:scale-95",
                              profile.preferredPositions.includes(pos)
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border bg-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground"
                            )}
                          >
                            {PREF_POSITION_SHORT[pos]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button type="submit" size="sm" disabled={saving} className="w-full sm:w-auto">
              {saving ? "저장 중..." : "저장"}
            </Button>
          </form>

          {/* 알림 설정 */}
          <div className="rounded-xl border border-border/50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">알림</p>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">푸시 알림</p>
                  <p className="text-xs text-muted-foreground">경기 등록, 투표 마감 알림</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={pushEnabled}
                onClick={handlePushToggle}
                disabled={pushLoading}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  pushEnabled ? "bg-primary" : "bg-muted-foreground/25"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200",
                    pushEnabled ? "translate-x-[22px]" : "translate-x-[2px]"
                  )}
                />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 팀 설정 (운영진 이상) ── */}
      {isStaffOrAbove(role) && (
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
                  <Label className="text-xs font-semibold text-muted-foreground">팀명</Label>
                  <Input
                    value={team.teamName}
                    onChange={(event) => setTeam({ ...team, teamName: event.target.value })}
                    disabled={!canEditTeam}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">초대 코드</Label>
                  <Input value={team.inviteCode} readOnly className="font-mono tracking-wider" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">팀 로고 URL</Label>
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
                    <Label className="text-xs font-semibold text-muted-foreground">홈 색상</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={uniformPrimary}
                        onChange={(event) => setTeam({ ...team, uniformPrimary: event.target.value })}
                        disabled={!canEditTeam}
                        className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-input bg-transparent p-0.5"
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
                    <Label className="text-xs font-semibold text-muted-foreground">원정 색상</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={uniformSecondary}
                        onChange={(event) => setTeam({ ...team, uniformSecondary: event.target.value })}
                        disabled={!canEditTeam}
                        className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-input bg-transparent p-0.5"
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
                  <Label className="text-xs font-semibold text-muted-foreground">패턴</Label>
                  <Select
                    value={uniformPattern}
                    onValueChange={(value) => setTeam({ ...team, uniformPattern: value as TeamSettings["uniformPattern"] })}
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
                    <div className="h-14 w-14 rounded-lg border border-border shadow-sm" style={getJerseyStyle(uniformPrimary, uniformSecondary, uniformPattern)} />
                    <span className="text-[11px] font-medium text-muted-foreground">홈</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="h-14 w-14 rounded-lg border border-border shadow-sm" style={getJerseyStyle(uniformSecondary, uniformPrimary, uniformPattern)} />
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
      )}

      {/* ── 시즌 관리 ── */}
      {canManageSeasons && <SeasonManager />}

      {/* ── 팀 삭제 ── */}
      {canEditTeam && (
        <Card className="border-[hsl(var(--loss))]/20">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-bold text-[hsl(var(--loss))]">팀 삭제</p>
            <p className="text-xs text-muted-foreground">
              팀을 삭제하면 모든 경기, 회비, 기록이 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <p className="text-xs text-muted-foreground">
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
              onClick={handleDeleteTeam}
              className="w-full"
            >
              팀 영구 삭제
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── Season Manager Component ── */
function SeasonManager() {
  const {
    data: seasonsPayload,
    loading,
    refetch,
  } = useApi<{ seasons: Record<string, unknown>[] }>("/api/seasons", { seasons: [] });

  const seasons: Season[] = useMemo(
    () => seasonsPayload.seasons.map(mapSeasonRaw),
    [seasonsPayload]
  );

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [creating, setCreating] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [seasonMsg, setSeasonMsg] = useState<string | null>(null);

  function autoGenerateName(start: string, end: string): string {
    if (!start || !end) return "";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const year = startDate.getFullYear();
    const startMonth = startDate.getMonth(); // 0-indexed
    const endMonth = endDate.getMonth();

    // Full year
    if (startMonth === 0 && endMonth === 11 && startDate.getDate() === 1 && endDate.getDate() === 31) {
      return `${year}`;
    }
    // First half
    if (startMonth === 0 && endMonth === 5 && startDate.getDate() === 1 && endDate.getDate() === 30) {
      return `${year} 상반기`;
    }
    // Second half
    if (startMonth === 6 && endMonth === 11 && startDate.getDate() === 1 && endDate.getDate() === 31) {
      return `${year} 하반기`;
    }
    return `${year} 시즌`;
  }

  async function handleCreate() {
    if (!newStart || !newEnd) return;
    const name = newName.trim() || autoGenerateName(newStart, newEnd);
    if (!name) return;

    setCreating(true);
    const { error } = await apiMutate("/api/seasons", "POST", {
      name,
      startDate: newStart,
      endDate: newEnd,
      isActive: seasons.length === 0, // first season is active by default
    });
    setCreating(false);

    if (error) {
      setSeasonMsg(`오류: ${error}`);
    } else {
      setSeasonMsg("시즌이 생성되었습니다.");
      setNewName("");
      setNewStart("");
      setNewEnd("");
      setShowForm(false);
      await refetch();
    }
    setTimeout(() => setSeasonMsg(null), 2000);
  }

  async function handleActivate(id: string) {
    setActivating(id);
    const { error } = await apiMutate("/api/seasons", "PUT", { id });
    setActivating(null);

    if (error) {
      setSeasonMsg(`오류: ${error}`);
    } else {
      setSeasonMsg("시즌이 활성화되었습니다.");
      await refetch();
    }
    setTimeout(() => setSeasonMsg(null), 2000);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const { error } = await apiMutate(`/api/seasons?id=${id}`, "DELETE");
    setDeleting(null);

    if (error) {
      setSeasonMsg(`오류: ${error}`);
    } else {
      setSeasonMsg("시즌이 삭제되었습니다.");
      await refetch();
    }
    setTimeout(() => setSeasonMsg(null), 2000);
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${y}.${m}.${d}`;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="font-heading text-lg sm:text-2xl font-bold uppercase text-foreground">
            시즌 관리
          </CardTitle>
        </div>
        <Badge variant="secondary">운영진 전용</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {seasonMsg && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
            {seasonMsg}
          </div>
        )}

        {/* Existing seasons list */}
        {seasons.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 시즌이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {seasons.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-xl p-4",
                  s.isActive ? "bg-primary/5 border border-primary/20" : "bg-secondary"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{s.name}</span>
                      {s.isActive && (
                        <Badge variant="success" className="shrink-0">활성</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(s.startDate)} ~ {formatDate(s.endDate)}
                    </p>
                  </div>
                </div>
                {!s.isActive && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activating === s.id}
                      onClick={() => handleActivate(s.id)}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      {activating === s.id ? "..." : "활성화"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deleting === s.id}
                      onClick={() => handleDelete(s.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      {deleting === s.id ? "..." : "삭제"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Toggle form button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="w-full"
        >
          {showForm ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              접기
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              새 시즌 추가
            </>
          )}
        </Button>

        {/* Create form (collapsible) */}
        {showForm && (
          <div className="rounded-xl bg-secondary p-5 space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold">시즌 이름</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="비워두면 자동 생성 (예: 2026, 2026 상반기)"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-semibold">시작일</Label>
                <Input
                  type="date"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">종료일</Label>
                <Input
                  type="date"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </div>
            </div>
            {newStart && newEnd && !newName && (
              <p className="text-xs text-muted-foreground">
                자동 생성 이름: <span className="font-semibold text-foreground">{autoGenerateName(newStart, newEnd)}</span>
              </p>
            )}
            <Button
              size="sm"
              disabled={creating || !newStart || !newEnd}
              onClick={handleCreate}
            >
              {creating ? "생성 중..." : "시즌 생성"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
