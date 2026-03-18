"use client";

import { useMemo, useCallback, useState } from "react";
import { useApi, apiMutate } from "@/lib/useApi";
import { useToast } from "@/lib/ToastContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationSettings = {
  email: boolean;
  push: boolean;
};

type InitialData = {
  notifications: Record<string, unknown>[];
  settings: Record<string, unknown> | null;
};

/** Map snake_case API row to camelCase client type */
function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    type: row.type as string,
    title: row.title as string,
    message: row.message as string,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at as string,
  };
}

function mapSettings(row: Record<string, unknown> | null): NotificationSettings {
  if (!row) return { email: true, push: false };
  return {
    email: Boolean(row.email ?? true),
    push: Boolean(row.push ?? false),
  };
}

export default function NotificationsClient({ initialData }: { initialData: InitialData }) {
  const { showToast } = useToast();
  const [markingAll, setMarkingAll] = useState(false);
  const [togglingKey, setTogglingKey] = useState<keyof NotificationSettings | null>(null);

  /* ── Data fetching ─────────────────────────────────────── */

  const {
    data: notifData,
    loading: loadingNotifs,
    error: notifError,
    refetch: refetchNotifs,
  } = useApi<{ notifications: Record<string, unknown>[] }>(
    "/api/notifications",
    { notifications: initialData.notifications },
    { skip: true }
  );

  const {
    data: settingsData,
    loading: loadingSettings,
    refetch: refetchSettings,
  } = useApi<{ settings: NotificationSettings }>(
    "/api/notification-settings",
    { settings: mapSettings(initialData.settings) },
    { skip: true }
  );

  const notifications: Notification[] = useMemo(
    () => (notifData.notifications ?? []).map(mapNotification),
    [notifData]
  );

  const settings: NotificationSettings = settingsData.settings;

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  /* ── Mutations ─────────────────────────────────────────── */

  const toggleRead = useCallback(
    async (id: string, currentlyRead: boolean) => {
      const { error } = await apiMutate("/api/notifications", "PUT", { id, isRead: !currentlyRead });
      if (error) {
        showToast("알림 상태 변경에 실패했습니다.", "error");
      }
      await refetchNotifs();
    },
    [refetchNotifs, showToast]
  );

  const markAllRead = useCallback(async () => {
    setMarkingAll(true);
    const { error } = await apiMutate("/api/notifications", "PUT", { all: true });
    setMarkingAll(false);
    if (error) {
      showToast("오류가 발생했습니다.", "error");
    } else {
      showToast("모든 알림을 읽음 처리했습니다.");
    }
    await refetchNotifs();
  }, [refetchNotifs, showToast]);

  const toggleSetting = useCallback(
    async (key: keyof NotificationSettings) => {
      setTogglingKey(key);
      const updated = { ...settings, [key]: !settings[key] };
      const { error } = await apiMutate("/api/notification-settings", "PUT", updated);
      setTogglingKey(null);
      if (error) {
        showToast("알림 설정 변경에 실패했습니다.", "error");
      } else {
        showToast("알림 설정이 변경되었습니다.");
      }
      await refetchSettings();
    },
    [settings, refetchSettings, showToast]
  );

  /* ── Error state ─────────────────────────────────────── */

  if (notifError) {
    return <Card className="p-6"><span className="text-destructive">오류: {notifError}</span></Card>;
  }

  /* ── Loading state ─────────────────────────────────────── */

  if (loadingNotifs || loadingSettings) {
    return (
      <div className="grid gap-5 stagger-children">
        <Card>
          <CardHeader>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-1 h-7 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────── */

  return (
    <div className="grid gap-5 stagger-children">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sky-400">
                Notifications
              </p>
              <CardTitle className="mt-1 font-heading text-2xl font-bold uppercase">
                알림 센터
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1.5 text-xs">
                미확인 {unreadCount}건
              </Badge>
              <Button size="sm" onClick={markAllRead} disabled={markingAll || unreadCount === 0}>
                {markingAll ? "처리 중..." : "전체 읽음"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Settings
          </p>
          <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
            알림 수신 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { key: "email", label: "이메일 알림" },
              { key: "push", label: "웹 푸시 알림" },
            ].map((item) => {
              const isOn = settings[item.key as keyof NotificationSettings];
              const isToggling = togglingKey === item.key;
              return (
                <Button
                  key={item.key}
                  variant={isOn ? "default" : "outline"}
                  className="justify-start px-4 py-3 text-sm font-semibold"
                  onClick={() => toggleSetting(item.key as keyof NotificationSettings)}
                  disabled={isToggling}
                >
                  {item.label}
                  <span className="ml-2 text-xs">
                    {isToggling ? "변경 중..." : isOn ? "켜짐" : "꺼짐"}
                  </span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Recent
          </p>
          <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
            최근 알림
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">새로운 알림이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={cn(
                    "transition",
                    notification.isRead
                      ? "border-0 bg-secondary"
                      : "border-sky-500/20 bg-sky-500/5"
                  )}
                >
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-semibold">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {notification.createdAt}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleRead(notification.id, notification.isRead)}
                    >
                      {notification.isRead ? "미확인" : "읽음"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
