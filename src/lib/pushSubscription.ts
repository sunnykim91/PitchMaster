"use client";

/**
 * Request notification permission and subscribe to web push.
 * Returns the subscription or null if denied/unavailable.
 * Throws on unexpected errors so callers can display messages.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("[Push] 이 브라우저에서 지원하지 않습니다");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("[Push] 알림 권한 거부:", permission);
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn("[Push] VAPID 키가 설정되지 않았습니다");
    return null;
  }

  // 기존 구독이 있어도 서버에 등록 (기기별로 다른 구독이므로)
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });
  }

  // 서버에 항상 등록 (기기별 구독 보장)
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[Push] 서버 구독 실패:", err);
  }

  return subscription;
}

/** Check if push notifications are supported and permitted */
export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

/** Check if user has already granted notification permission */
export function isPushPermissionGranted(): boolean {
  return typeof Notification !== "undefined" && Notification.permission === "granted";
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
