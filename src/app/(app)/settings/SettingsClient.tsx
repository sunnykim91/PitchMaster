"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useApi, apiMutate } from "@/lib/useApi";
import type { PreferredPosition, PreferredFoot, Role } from "@/lib/types";
import { POSITION_GROUPS, PREF_POSITION_LABEL, PREF_POSITION_SHORT } from "@/lib/types";
import { isPresident } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatPhone, stripPhone } from "@/lib/utils";

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
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      {message ? (
        <Card className="border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          {message}
        </Card>
      ) : null}

      {/* Profile Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Profile</p>
            <CardTitle className="mt-1 font-heading text-2xl font-bold uppercase text-foreground">
              개인 설정
            </CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            로그아웃
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="grid gap-4 rounded-xl bg-secondary p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-semibold">이름</Label>
                <Input
                  value={profile.name}
                  onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">연락처</Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={formatPhone(profile.phone)}
                  onChange={(event) => setProfile({ ...profile, phone: stripPhone(event.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">프로필 이미지 URL</Label>
              <Input
                value={profile.profileImageUrl}
                onChange={(event) => setProfile({ ...profile, profileImageUrl: event.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-semibold">주발</Label>
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
              <div className="space-y-2">
                <Label className="font-semibold">선호 포지션</Label>
                <div className="space-y-3">
                  {POSITION_GROUPS.map((group) => (
                    <div key={group.group}>
                      <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{group.group}</p>
                      <div className="flex flex-wrap gap-2">
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
                              "rounded-md border px-3 py-1.5 text-sm font-medium transition-all",
                              profile.preferredPositions.includes(pos)
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-input bg-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground"
                            )}
                          >
                            {PREF_POSITION_SHORT[pos]} · {PREF_POSITION_LABEL[pos]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button type="submit" size="sm" className="justify-self-start" disabled={saving}>
              {saving ? "저장 중..." : "개인 설정 저장"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Team Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Team</p>
            <CardTitle className="mt-1 font-heading text-2xl font-bold uppercase text-foreground">
              팀 설정
            </CardTitle>
          </div>
          {!canEditTeam && (
            <Badge variant="secondary">회장만 수정 가능</Badge>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTeamSubmit} className="grid gap-4 rounded-xl bg-secondary p-5">
            <div className="space-y-2">
              <Label className="font-semibold">팀명</Label>
              <Input
                value={team.teamName}
                onChange={(event) => setTeam({ ...team, teamName: event.target.value })}
                disabled={!canEditTeam}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">팀 로고 URL</Label>
              <Input
                value={team.logoUrl}
                onChange={(event) => setTeam({ ...team, logoUrl: event.target.value })}
                placeholder="https://..."
                disabled={!canEditTeam}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">초대 코드</Label>
              <Input value={team.inviteCode} readOnly />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-semibold">홈 유니폼 색상</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={uniformPrimary}
                    onChange={(event) => setTeam({ ...team, uniformPrimary: event.target.value })}
                    disabled={!canEditTeam}
                    className="h-12 w-12 rounded-xl border border-input bg-transparent p-1"
                  />
                  <Input
                    value={uniformPrimary}
                    onChange={(event) => setTeam({ ...team, uniformPrimary: event.target.value })}
                    disabled={!canEditTeam}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">원정 유니폼 색상</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={uniformSecondary}
                    onChange={(event) => setTeam({ ...team, uniformSecondary: event.target.value })}
                    disabled={!canEditTeam}
                    className="h-12 w-12 rounded-xl border border-input bg-transparent p-1"
                  />
                  <Input
                    value={uniformSecondary}
                    onChange={(event) => setTeam({ ...team, uniformSecondary: event.target.value })}
                    disabled={!canEditTeam}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">유니폼 패턴</Label>
                <Select
                  value={uniformPattern}
                  onValueChange={(value) =>
                    setTeam({
                      ...team,
                      uniformPattern: value as TeamSettings["uniformPattern"],
                    })
                  }
                  disabled={!canEditTeam}
                >
                  <SelectTrigger>
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
            </div>
            <Card className="border-0 bg-secondary">
              <CardContent className="p-4">
                <p className="text-sm font-bold text-foreground">유니폼 미리보기</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="h-16 w-16 border border-border"
                      style={getJerseyStyle(uniformPrimary, uniformSecondary, uniformPattern)}
                    />
                    <span className="text-xs text-muted-foreground">홈</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="h-16 w-16 border border-border"
                      style={getJerseyStyle(uniformSecondary, uniformPrimary, uniformPattern)}
                    />
                    <span className="text-xs text-muted-foreground">원정</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex flex-wrap items-center gap-3">
              {canEditTeam && (
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? "저장 중..." : "팀 설정 저장"}
                </Button>
              )}
              {canEditTeam && (
                confirmDelete ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteTeam}
                    >
                      정말 삭제하기
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                    >
                      취소
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                  >
                    팀 삭제
                  </Button>
                )
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
