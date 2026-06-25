"use client";

/**
 * InAppBrowserBanner — 인앱 브라우저 감지 시 외부 브라우저로 열기 안내
 *
 * 카톡·인스타·밴드 등 '앱 속 미니 브라우저'는 카카오 로그인 차단·로그인 비유지·
 * Web Push 미지원 등 제약이 있어 외부 브라우저(Chrome/Safari)로 열도록 유도.
 *
 * - 감지: navigator.userAgent (카톡·인스타·페북·네이버·밴드·라인·다음)
 * - 외부 열기:
 *   - 카카오톡: kakaotalk://web/openExternal?url=...  (원탭 자동 전환)
 *   - 그 외: 자동 전환 scheme이 제각각이라 현재 주소를 클립보드 복사 → 사파리/크롬에 붙여넣기 유도
 * - context: "app"(로그인 후·기본) | "login"(랜딩) — 문구·배치 분기
 * - dismiss: 24h 동안 안 보임
 */

import { useEffect, useState } from "react";
import { ExternalLink, X, Copy, Check } from "lucide-react";

const DISMISS_KEY = "pm_inapp_banner_dismissed_at";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// 인앱 브라우저 UA 토큰 (카톡·인스타·페북·네이버·밴드·라인·다음·카카오스토리)
const INAPP_RE = /(KAKAOTALK|Instagram|FBAN|FBAV|FB_IAB|NAVER\(inapp|NAVER|;\s?BAND|\bLine\/|DaumApps|kakaostory)/i;

export function InAppBrowserBanner({ context = "app" }: { context?: "app" | "login" }) {
  const [show, setShow] = useState(false);
  const [isKakao, setIsKakao] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    if (!INAPP_RE.test(ua)) return;
    setIsKakao(/KAKAOTALK/i.test(ua));

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

  function handleAction() {
    if (typeof window === "undefined") return;
    const currentUrl = window.location.href;
    if (isKakao) {
      // 카카오톡 인앱 브라우저는 이 URL scheme을 받으면 외부 브라우저로 전환
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
      return;
    }
    // 그 외 인앱 — 자동 전환 scheme이 제각각이라 주소 복사로 폴백
    try {
      navigator.clipboard?.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // 클립보드 차단 환경 — 무시 (안내 문구로 수동 유도)
    }
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

  const headline = context === "login" ? "카카오 로그인이 막힐 수 있어요." : "알림이 안 올 수 있어요.";
  const sub = isKakao
    ? "외부 브라우저로 열어주세요."
    : copied
      ? "주소를 복사했어요. 사파리·크롬에 붙여넣어 주세요."
      : "사파리·크롬으로 열어주세요.";

  // app(로그인 후): 기존처럼 sticky top. login(랜딩): 고정 헤더 아래 in-flow 배치.
  const outerClass =
    context === "login"
      ? "relative z-30 mt-14 lg:mt-16 flex items-center gap-2 px-3 py-2.5 text-[13px] leading-tight"
      : "sticky top-0 z-50 flex items-center gap-2 px-3 py-2.5 text-[13px] leading-tight";

  return (
    <div
      role="alert"
      className={outerClass}
      style={{
        background: "hsl(var(--warning) / 0.15)",
        borderBottom: "1px solid hsl(var(--warning) / 0.40)",
        color: "hsl(var(--warning))",
      }}
    >
      <ExternalLink className="h-4 w-4 shrink-0" />
      <span className="flex-1 min-w-0">
        <b className="font-semibold">{headline}</b>{" "}
        <span className="text-foreground/85">{sub}</span>
      </span>
      <button
        type="button"
        onClick={handleAction}
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition-colors"
        style={{
          background: "hsl(var(--warning))",
          color: "hsl(var(--warning-foreground, 0 0% 10%))",
        }}
      >
        {isKakao ? (
          "열기"
        ) : copied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            복사됨
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            주소 복사
          </>
        )}
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="배너 닫기"
        className="shrink-0 rounded-full p-1.5 hover:bg-[hsl(var(--foreground)_/_0.1)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
