"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import { Bell, Sun, Moon, Monitor, Camera, Link2, AlertTriangle, MessageSquare } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { subscribeToPush } from "@/lib/pushSubscription";
import { apiMutate } from "@/lib/useApi";
import { useToast } from "@/lib/ToastContext";
import { useConfirm } from "@/lib/ConfirmContext";
import type { PreferredPosition, PreferredFoot } from "@/lib/types";
import { POSITION_GROUPS, PREF_POSITION_SHORT, FUTSAL_POSITION_GROUPS, FUTSAL_POSITION_SHORT } from "@/lib/types";
import type { SportType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toKoreanError } from "@/lib/errorMessages";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatPhone, stripPhone } from "@/lib/utils";

const APP_VERSION = "Beta 1.0.1";
const FEEDBACK_EMAIL = "tjsgnl2002@gmail.com";

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
  sportType?: SportType;
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
  sportType,
}: PersonalSettingsProps) {
  const isFutsal = sportType === "FUTSAL";
  const posGroups = isFutsal ? FUTSAL_POSITION_GROUPS : POSITION_GROUPS;
  const posShort = isFutsal ? FUTSAL_POSITION_SHORT : PREF_POSITION_SHORT;
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [jerseyNumber, setJerseyNumber] = useState<string>("");
  const [jerseySaving, setJerseySaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const confirm = useConfirm();

  function handleFeedback() {
    const lines = [
      "",
      "",
      "",
      "━━━━━━━━━━━━━━━━━━━━",
      "아래는 디버그 정보입니다 (수정하지 마세요)",
      `버전: ${APP_VERSION}`,
      `기기: ${typeof navigator !== "undefined" ? navigator.userAgent : "N/A"}`,
      `사용자: ${profile.name || "알 수 없음"}`,
      `시각: ${new Date().toLocaleString("ko-KR")}`,
      "━━━━━━━━━━━━━━━━━━━━",
    ];
    const subject = "[PitchMaster 피드백]";
    const body = lines.join("\n");
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function handleWithdraw() {
    // 2단계 확인 — 실수로 탈퇴하지 않도록
    const firstOk = await confirm({
      title: "정말 탈퇴하시겠어요?",
      description:
        "개인 식별 정보(이름·연락처·생일·프로필 사진)는 탈퇴 즉시 익명 처리됩니다. 팀 경기 기록은 팀 자산으로 14일간 유지된 후 완전 삭제됩니다.",
      confirmLabel: "다음",
      cancelLabel: "취소",
    });
    if (!firstOk) return;

    const secondOk = await confirm({
      title: "마지막 확인",
      description:
        "이 작업은 되돌릴 수 없습니다. 탈퇴 즉시 로그아웃되며, 카카오로 재로그인해도 이전 데이터는 복구되지 않습니다.",
      confirmLabel: "탈퇴",
      cancelLabel: "취소",
      variant: "destructive",
    });
    if (!secondOk) return;

    setWithdrawing(true);
    try {
      const res = await fetch("/api/account/withdraw", { method: "POST" });
      if (res.ok || res.status === 204) {
        showToast("탈퇴가 완료되었습니다", "success");
        // 세션 쿠키는 서버에서 이미 clear. 로그인 페이지로 이동
        window.location.href = "/login";
      } else {
        const body = await res.json().catch(() => ({}));
        showToast(
          body.error === "db_unavailable" ? "일시적인 오류입니다. 잠시 후 다시 시도해주세요" : "탈퇴 처리에 실패했습니다",
          "error",
        );
      }
    } catch {
      showToast("네트워크 오류로 탈퇴에 실패했습니다", "error");
    } finally {
      setWithdrawing(false);
    }
  }

  // 알림 설정 로드 — DB에 설정이 없으면 OFF (구독 전)
  useEffect(() => {
    fetch("/api/notification-settings")
      .then((r) => r.json())
      .then((j) => { if (j.settings) setPushEnabled(j.settings.push ?? false); })
      .catch(() => {});
  }, []);

  // 등번호 로드
  useEffect(() => {
    fetch("/api/members", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        const me = j.members?.find((m: { user_id: string; jersey_number?: number }) =>
          m.user_id && j.members.some(() => true) // find my member row
        );
        // userId 기반으로 본인 찾기 — profile API에서 user_id를 얻을 수 없으므로
        // 모든 멤버에서 jersey_number를 가진 내 row를 찾는 대안
        for (const m of j.members ?? []) {
          // PersonalSettings는 본인만 수정 → user_id가 있는 row 중 하나
          if (m.user_id) {
            // API context의 userId와 비교 불가 → 대신 내 이름으로 매칭
            const userName = m.users?.name ?? m.pre_name;
            if (userName === profile.name) {
              setMyMemberId(m.id);
              setJerseyNumber(m.jersey_number != null ? String(m.jersey_number) : "");
              break;
            }
          }
        }
      })
      .catch(() => {});
  }, [profile.name]);

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
      setMessage(toKoreanError(String(error)));
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

  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localImage, setLocalImage] = useState(profile.profileImageUrl || "");

  // 프로필 사진 직접 업로드
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("파일 크기는 5MB 이하만 가능합니다", "error"); return; }
    if (!file.type.startsWith("image/")) { showToast("이미지 파일만 업로드 가능합니다", "error"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/profile/image", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) { showToast(json.error || "업로드에 실패했습니다", "error"); return; }
      setLocalImage(json.imageUrl);
      setProfile({ ...profile, profileImageUrl: json.imageUrl });
      showToast("프로필 사진이 변경되었습니다");
    } catch { showToast("업로드 중 오류가 발생했습니다", "error"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }

  // 카카오 프로필 사진 연동 (추가 동의 → /settings로 복귀)
  function handleKakaoLink() {
    window.location.href = "/api/auth/kakao?scope=profile_image&redirect=/settings";
  }

  // 프로필 사진 삭제
  async function handleImageDelete() {
    const res = await fetch("/api/profile/image", { method: "DELETE" });
    if (res.ok) {
      setLocalImage("");
      setProfile({ ...profile, profileImageUrl: "" });
      showToast("프로필 사진이 삭제되었습니다");
    } else {
      showToast("삭제에 실패했습니다", "error");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-bold">개인 설정</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={onLogout}>
            로그아웃
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 프로필 사진 영역 */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-secondary ring-2 ring-border transition-all hover:ring-primary"
              disabled={uploading}
            >
              {localImage ? (
                <Image src={localImage} alt="프로필" width={64} height={64} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-muted-foreground">{profile.name?.charAt(0) || "?"}</span>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </div>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm text-muted-foreground">사진을 클릭해서 변경</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleKakaoLink}>
                <Link2 className="h-3.5 w-3.5" />
                카카오 사진 연동
              </Button>
              {localImage && (
                <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive" onClick={handleImageDelete}>
                  삭제
                </Button>
              )}
            </div>
          </div>
        </div>

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

          {/* 등번호 */}
          {myMemberId && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-muted-foreground">등번호</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={999}
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(e.target.value)}
                    placeholder="미설정"
                    className="w-24"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={jerseySaving}
                    onClick={async () => {
                      setJerseySaving(true);
                      const num = jerseyNumber.trim() === "" ? null : Number(jerseyNumber);
                      const { error } = await apiMutate("/api/members", "PUT", {
                        action: "update_jersey_number",
                        memberId: myMemberId,
                        jerseyNumber: num,
                      });
                      setJerseySaving(false);
                      if (error) setMessage(toKoreanError(String(error)));
                      else setMessage("등번호가 저장되었습니다.");
                      setTimeout(() => setMessage(null), 2000);
                    }}
                  >
                    {jerseySaving ? "저장 중..." : "저장"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">0~999 사이 숫자, 팀 내 중복 불가</p>
              </div>
            </div>
          )}

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
              <Label className="text-sm font-semibold text-muted-foreground">
                선호 포지션
                {profile.preferredPositions.length > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-primary">{profile.preferredPositions.length}개 선택</span>
                )}
              </Label>
              <div className="space-y-3">
                {posGroups.map((group) => (
                  <div key={group.group}>
                    <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{group.group}</p>
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
                              : "border-border bg-transparent text-secondary-foreground hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          {(posShort as Record<string, string>)[pos] ?? pos}
                          {isFutsal && pos !== "GK" && (
                            <span className="ml-1 text-muted-foreground font-normal">
                              {pos === "FIXO" ? "(수비)" : pos === "ALA" ? "(측면)" : pos === "PIVO" ? "(공격)" : ""}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "저장 중..." : "저장"}
          </Button>
        </form>

        {/* 테마 설정 */}
        <ThemeSelector />

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

        {/* 피드백 */}
        <div className="rounded-xl border border-border p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">피드백</p>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium">버그 제보 · 기능 건의</p>
                <p className="text-sm text-muted-foreground">불편한 점이나 원하는 기능을 알려주세요</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={handleFeedback}>
              보내기
            </Button>
          </div>
        </div>

        {/* 계정 관리 (탈퇴) — 카드 맨 하단 위험 영역 */}
        <div className="mt-6 border-t border-destructive/20 pt-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive/80" />
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-semibold text-foreground">계정 탈퇴</h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                탈퇴 시 개인 식별 정보는 즉시 익명 처리되고, 팀 경기 기록은 팀 자산으로 14일간 유지된 후 완전 삭제됩니다.
                이 작업은 되돌릴 수 없습니다.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleWithdraw}
                disabled={withdrawing}
              >
                {withdrawing ? "탈퇴 처리 중..." : "계정 탈퇴"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "system" as const, label: "시스템 자동", icon: Monitor },
    { value: "light" as const, label: "라이트", icon: Sun },
    { value: "dark" as const, label: "다크", icon: Moon },
  ];

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">테마</p>
      <div className="flex gap-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition-all active:scale-95",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const PersonalSettings = memo(PersonalSettingsComponent);
