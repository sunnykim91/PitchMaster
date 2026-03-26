"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/useApi";
import type { PreferredPosition, PreferredFoot, Role } from "@/lib/types";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PersonalSettings } from "./PersonalSettings";
import { TeamSettings } from "./TeamSettings";
import { SeasonManagement } from "./SeasonManagement";

type Season = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

type Profile = {
  name: string;
  phone: string;
  preferredPositions: PreferredPosition[];
  preferredFoot: PreferredFoot;
  profileImageUrl: string;
};

type TeamSettingsData = {
  teamName: string;
  logoUrl: string;
  inviteCode: string;
  uniformPrimary: string;
  uniformSecondary: string;
  uniformPattern: "SOLID" | "STRIPES_VERTICAL" | "STRIPES_HORIZONTAL" | "STRIPES_DIAGONAL";
  isSearchable: boolean;
  joinMode: "AUTO" | "MANUAL";
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
    uniform_pattern: TeamSettingsData["uniformPattern"];
    is_searchable: boolean;
    join_mode: "AUTO" | "MANUAL";
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

function mapTeamResponse(res: TeamApiResponse, fallback: TeamSettingsData): TeamSettingsData {
  const t = res.team;
  return {
    teamName: t.name ?? fallback.teamName,
    logoUrl: t.logo_url ?? fallback.logoUrl,
    inviteCode: t.invite_code ?? fallback.inviteCode,
    uniformPrimary: t.uniform_primary ?? fallback.uniformPrimary,
    uniformSecondary: t.uniform_secondary ?? fallback.uniformSecondary,
    uniformPattern: t.uniform_pattern ?? fallback.uniformPattern,
    isSearchable: t.is_searchable ?? fallback.isSearchable,
    joinMode: t.join_mode ?? fallback.joinMode,
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
  sessionTeam: TeamSettingsData;
  userRole?: Role;
  initialData?: InitialData;
}) {
  const router = useRouter();
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);

  // SSR initialData와 세션 fallback 병합
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

  const defaultTeam = useMemo((): TeamSettingsData => {
    const t = initialData?.team;
    if (t) {
      return {
        teamName: (t.name as string) ?? sessionTeam.teamName,
        logoUrl: (t.logo_url as string) ?? sessionTeam.logoUrl,
        inviteCode: (t.invite_code as string) ?? sessionTeam.inviteCode,
        uniformPrimary: (t.uniform_primary as string) ?? sessionTeam.uniformPrimary,
        uniformSecondary: (t.uniform_secondary as string) ?? sessionTeam.uniformSecondary,
        uniformPattern: (t.uniform_pattern as TeamSettingsData["uniformPattern"]) ?? sessionTeam.uniformPattern,
        isSearchable: (t.is_searchable as boolean) ?? sessionTeam.isSearchable,
        joinMode: (t.join_mode as TeamSettingsData["joinMode"]) ?? sessionTeam.joinMode,
      };
    }
    return sessionTeam;
  }, [initialData, sessionTeam]);

  const hasInitialData = Boolean(initialData?.profile && initialData?.team);

  // --- 프로필 API fetch ---
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

  // --- 팀 API fetch ---
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
      is_searchable: defaultTeam.isSearchable,
      join_mode: defaultTeam.joinMode,
    },
  }, { skip: hasInitialData });

  // --- 로컬 폼 상태 ---
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [team, setTeam] = useState<TeamSettingsData>(defaultTeam);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  // API 데이터가 도착하면 로컬 상태에 동기화
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

  const ready = !profileLoading && !teamLoading;
  const canManageSeasons = isStaffOrAbove(role);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/login");
  }

  async function handleDeleteTeam() {
    try {
      await fetch("/api/teams", { method: "DELETE" });
    } catch {
      // ignore
    }
    router.push("/login");
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
      <PersonalSettings
        profile={profile}
        setProfile={setProfile}
        saving={saving}
        setSaving={setSaving}
        setMessage={setMessage}
        refetchProfile={refetchProfile}
        profileSyncedRef={profileSynced}
        onLogout={handleLogout}
      />

      {/* ── 팀 설정 (운영진 이상) ── */}
      {isStaffOrAbove(role) && (
        <TeamSettings
          team={team}
          setTeam={setTeam}
          saving={saving}
          setSaving={setSaving}
          setMessage={setMessage}
          refetchTeam={refetchTeam}
          teamSyncedRef={teamSynced}
          role={role}
          deleteConfirmName={deleteConfirmName}
          setDeleteConfirmName={setDeleteConfirmName}
          onDeleteTeam={handleDeleteTeam}
        />
      )}

      {/* ── 시즌 관리 ── */}
      {canManageSeasons && <SeasonManagement />}
    </div>
  );
}
