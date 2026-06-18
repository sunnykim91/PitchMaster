"use client";

import { useEffect } from "react";

/**
 * 네이티브 FCM 토큰 등록.
 *
 * 네이티브 앱(TWA Android)이 launch URL 에 `?pmNativeToken=...&pmPlatform=android`
 * 형태로 FCM 토큰을 실어 보낸다. 이 컴포넌트가:
 *   1) URL 에서 토큰을 읽어 /api/push/native-token 로 등록 (로그인 유저와 연결)
 *   2) localStorage `pm_native_push=1` 플래그 설정 → 웹푸시 구독을 끈다 (중복 방지)
 *   3) URL 에서 토큰 파라미터를 제거 (history.replaceState)
 *
 * 인증된 (app) 레이아웃에서만 마운트되므로 호출 시 로그인 상태 보장.
 */
let attempted = false;

export default function NativePushRegister() {
  useEffect(() => {
    if (attempted || typeof window === "undefined") return;

    let url: URL;
    try {
      url = new URL(window.location.href);
    } catch {
      return;
    }

    const token = url.searchParams.get("pmNativeToken");
    const platform = url.searchParams.get("pmPlatform") || "android";
    if (!token) return;

    attempted = true;

    // 네이티브 앱 환경 표시 → 웹푸시 구독 차단 (isNativePush)
    try {
      window.localStorage.setItem("pm_native_push", "1");
    } catch {
      /* noop */
    }

    // 서버에 토큰 등록
    fetch("/api/push/native-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, platform }),
    }).catch((e) => {
      console.warn("[NativePush] 토큰 등록 실패:", e);
    });

    // URL 에서 토큰 파라미터 제거 (주소에 토큰 남기지 않음)
    try {
      url.searchParams.delete("pmNativeToken");
      url.searchParams.delete("pmPlatform");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch {
      /* noop */
    }
  }, []);

  return null;
}
