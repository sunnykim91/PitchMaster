"use client";

/**
 * InAppBrowserBanner — 카카오 인앱 브라우저 감지 시 외부 브라우저로 열기 안내
 *
 * 카카오톡 인앱 브라우저는 Web Push 미지원·일부 PWA 기능 제약이 있어
 * 외부 브라우저(Chrome/Safari)로 열도록 유도.
 *
 * - 감지: navigator.userAgent에 "KAKAOTALK" 포함
 * - 외부 열기:
 *   - Android: kakaotalk://web/openExternal?url=...
 *   - iOS: 같은 URL scheme (카카오톡이 처리)
 * - dismiss: sessionStorage 24h 동안 안 보임
 */

import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";

const DISMISS_KEY = "pm_inapp_banner_dismissed_at";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export function InAppBrowserBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // 카카오톡 인앱 브라우저만 대상 (그 외 일반 브라우저는 노출 X)
    const ua = navigator.userAgent || "";
    const isKakaoInApp = /KAKAOTALK/i.test(ua);
    if (!isKakaoInApp) return;

    // 24h 내 dismiss 했으면 미노출
    try {
      const dismissedAt = sessionStorage.getItem(DISMISS_KEY) || localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const ts = Number(dismissedAt);
        if (Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_MS) return;
      }
    } catch {
      // storage 접근 실패해도 배너는 노출 (안전)
    }

    setShow(true);
  }, []);

  function handleOpenExternal() {
    if (typeof window === "undefined") return;
    const currentUrl = window.location.href;
    // 카카오톡 인앱 브라우저는 이 URL scheme을 받으면 외부 브라우저로 전환
    const externalUrl = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
    window.location.href = externalUrl;
  }

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 flex items-center gap-2 px-3 py-2.5 text-[13px] leading-tight"
      style={{
        background: "hsl(var(--warning) / 0.15)",
        borderBottom: "1px solid hsl(var(--warning) / 0.40)",
        color: "hsl(var(--warning))",
      }}
    >
      <ExternalLink className="h-4 w-4 shrink-0" />
      <span className="flex-1 min-w-0">
        <b className="font-semibold">알림이 안 올 수 있어요.</b>{" "}
        <span className="text-foreground/85">외부 브라우저로 열어주세요.</span>
      </span>
      <button
        type="button"
        onClick={handleOpenExternal}
        className="shrink-0 rounded-md px-3 py-1.5 text-xs font-bold transition-colors"
        style={{
          background: "hsl(var(--warning))",
          color: "hsl(var(--warning-foreground, 0 0% 10%))",
        }}
      >
        열기
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="배너 닫기"
        className="shrink-0 rounded-full p-1.5 hover:bg-foreground/10"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
