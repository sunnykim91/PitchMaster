"use client";

import { useEffect } from "react";
import { subscribeToPush, isPushSupported, isNativePush } from "@/lib/pushSubscription";

/**
 * TWA(Play Store 앱) 사용자가 설치 시 안드로이드 알림 권한을 이미 허용해 둔 경우,
 * 앱 실행 때 추가 팝업 없이 웹 푸시 구독을 자동 등록한다.
 *
 * 배경: TWA 빌드는 enableNotifications:true(targetSdk 35)라 설치 시 OS 알림 권한을
 * 받지만, 그 권한을 실제 푸시 구독(push_subscriptions)으로 잇는 단계가 비어 있었다.
 * (subscribeToPush 호출처가 설정 토글 단 한 곳뿐 → 구독자 4명)
 *
 * 동작 규칙:
 * - TWA 진입(pm_twa)만 대상. 일반 웹/PWA는 건드리지 않음.
 * - OS 권한이 이미 "granted" 일 때만 실행 → requestPermission 이 팝업 없이 즉시 통과.
 *   (default/denied 면 아무 것도 안 함 → 원치 않는 팝업을 띄우지 않는다)
 * - 세션당 1회. 인증된 (app) 레이아웃에서만 마운트되므로 호출 시 로그인 상태 보장.
 */
let attempted = false;

export default function PushAutoSubscribe() {
  useEffect(() => {
    if (attempted || typeof window === "undefined") return;

    // 네이티브 FCM 앱이면 웹푸시 구독을 하지 않는다 (네이티브로 받으므로 중복 방지)
    if (isNativePush()) return;

    let isTwa = false;
    try {
      isTwa =
        window.sessionStorage.getItem("pm_twa") === "1" ||
        /^android-app:\/\/app\.pitchmaster/i.test(document.referrer ?? "");
    } catch {
      return; // sessionStorage 차단 환경
    }
    if (!isTwa || !isPushSupported()) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    try {
      if (window.sessionStorage.getItem("pm_push_auto") === "1") return;
    } catch {
      return;
    }

    attempted = true;
    subscribeToPush()
      .then((sub) => {
        if (sub) {
          try {
            window.sessionStorage.setItem("pm_push_auto", "1");
          } catch {
            /* noop */
          }
        }
      })
      .catch((e) => {
        console.warn("[Push] TWA 자동 구독 실패:", e);
      });
  }, []);

  return null;
}
