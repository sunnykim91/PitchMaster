"use client";

import { memo, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Bell } from "lucide-react";
import { subscribeToPush } from "@/lib/pushSubscription";
import { apiMutate } from "@/lib/useApi";
import type { PreferredPosition, PreferredFoot } from "@/lib/types";
import { POSITION_GROUPS, PREF_POSITION_SHORT } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatPhone, stripPhone } from "@/lib/utils";

type Profile = {
  name: string;
  phone: string;
  preferredPositions: PreferredPosition[];
  preferredFoot: PreferredFoot;
  profileImageUrl: string;
};

interface PersonalSettingsProps {
  profile: Profile;
  setProfile: (profile: Profile) => void;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  setMessage: (msg: string | null) => void;
  refetchProfile: () => void;
  profileSyncedRef: React.MutableRefObject<boolean>;
  onLogout: () => void;
}

function PersonalSettingsComponent({
  profile,
  setProfile,
  saving,
  setSaving,
  setMessage,
  refetchProfile,
  profileSyncedRef,
  onLogout,
}: PersonalSettingsProps) {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // 알림 설정 로드 — DB에 설정이 없으면 OFF (구독 전)
  useEffect(() => {
    fetch("/api/notification-settings")
      .then((r) => r.json())
      .then((j) => { if (j.settings) setPushEnabled(j.settings.push ?? false); })
      .catch(() => {});
  }, []);

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
      profileSyncedRef.current = false;
      await refetchProfile();
    }
    setTimeout(() => setMessage(null), 2000);
  }

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

  return (
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
              <p className="text-sm text-muted-foreground">프로필 및 알림을 관리합니다</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={onLogout}>
            로그아웃
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleProfileSubmit} className="space-y-5">
          {/* 기본 정보 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-muted-foreground">이름</Label>
              <Input
                value={profile.name}
                onChange={(event) => setProfile({ ...profile, name: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-muted-foreground">연락처</Label>
              <Input
                type="tel"
                inputMode="numeric"
                value={formatPhone(profile.phone)}
                onChange={(event) => setProfile({ ...profile, phone: stripPhone(event.target.value) })}
              />
            </div>
          </div>

          {/* 플레이 스타일 */}
          <div className="rounded-xl border border-border p-4 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">플레이 스타일</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-muted-foreground">주발</Label>
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
              <Label className="text-sm font-semibold text-muted-foreground">선호 포지션</Label>
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
        <div className="rounded-xl border border-border p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">알림</p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium">푸시 알림</p>
                <p className="text-sm text-muted-foreground">경기 등록, 투표 마감 알림</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pushLoading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
              <button
                type="button"
                role="switch"
                aria-checked={pushEnabled}
                onClick={handlePushToggle}
                disabled={pushLoading}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  pushLoading && "opacity-50 cursor-wait",
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
          {pushLoading && (
            <p className="mt-2 text-xs text-muted-foreground animate-pulse">알림 권한을 확인하고 있습니다...</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const PersonalSettings = memo(PersonalSettingsComponent);
