"use client";

import { useEffect } from "react";

/**
 * TWA(Trusted Web Activity = Play Store 알파 빌드) 첫 진입 시 referrer를
 * sessionStorage 에 캡처. OAuth 리다이렉트로 document.referrer 가 손실된 후에도
 * 같은 세션 내에서 TWA 진입임을 식별 가능.
 *
 * - 첫 진입 시 document.referrer 가 android-app://app.pitchmaster 로 시작해야만 저장
 * - PWA·일반 브라우저 진입은 처음부터 https referrer 라 저장 자체 안 됨 (false positive 차단)
 * - sessionStorage 라 TWA WebView 세션 종료 시 자연스럽게 만료
 *
 * Root layout 에 마운트해서 모든 페이지(특히 /login) 첫 진입 시점 캡처.
 */
export default function TwaReferrerCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem("pm_twa") === "1") return;
      const ref = document.referrer ?? "";
      if (/^android-app:\/\/app\.pitchmaster/i.test(ref)) {
        window.sessionStorage.setItem("pm_twa", "1");
      }
    } catch {
      // sessionStorage 차단 환경 (시크릿 모드 등)
    }
  }, []);
  return null;
}
