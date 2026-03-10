"use client";

import { useMemo, useCallback } from "react";
import { useApi, apiMutate } from "@/lib/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default function NotificationsClient() {
  /* ── Data fetching ─────────────────────────────────────── */

  const {
    data: notifData,
    loading: loadingNotifs,
    refetch: refetchNotifs,
  } = useApi<{ notifications: Record<string, unknown>[] }>(
    "/api/notifications",
    { notifications: [] }
  );

  const {
    data: settingsData,
    loading: loadingSettings,
    refetch: refetchSettings,
  } = useApi<{ settings: NotificationSettings }>(
    "/api/notification-settings",
    { settings: { email: true, push: false } }
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
    async (id: string) => {
      await apiMutate("/api/notifications", "PUT", { id });
      await refetchNotifs();
    },
    [refetchNotifs]
  );

  const markAllRead = useCallback(async () => {
    await apiMutate("/api/notifications", "PUT", { all: true });
    await refetchNotifs();
  }, [refetchNotifs]);

  const toggleSetting = useCallback(
    async (key: keyof NotificationSettings) => {
      const updated = { ...settings, [key]: !settings[key] };
      await apiMutate("/api/notification-settings", "PUT", updated);
      await refetchSettings();
    },
    [settings, refetchSettings]
  );

  /* ── Loading state ─────────────────────────────────────── */

  if (loadingNotifs || loadingSettings) {
    return (
      <Card>
        <CardContent className="p-6">불러오는 중...</CardContent>
      </Card>
    );
  }

  /* ── Render ────────────────────────────────────────────── */

  return (
    <div className="grid gap-5">
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
              <Button size="sm" onClick={markAllRead}>
                전체 읽음
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
              return (
                <Button
                  key={item.key}
                  variant={isOn ? "default" : "outline"}
                  className="justify-start px-4 py-3 text-sm font-semibold"
                  onClick={() => toggleSetting(item.key as keyof NotificationSettings)}
                >
                  {item.label}
                  <span className="ml-2 text-xs">{isOn ? "켜짐" : "꺼짐"}</span>
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
                    onClick={() => toggleRead(notification.id)}
                  >
                    {notification.isRead ? "미확인" : "읽음"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
