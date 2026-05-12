"use client";

import { useEffect } from "react";

/**
 * 가입 출처 자동 캡처 — first-touch attribution.
 *
 * 흐름:
 *   1) 페이지 첫 로드 시 utm_source 파라미터 또는 referrer 호스트 캡처
 *   2) 쿠키 `pm_signup_source` (30일 TTL) 에 저장 — first-touch 만 유지
 *   3) 카카오 OAuth 콜백에서 쿠키 읽어 users.signup_source 박음
 *
 * 정책:
 *   - utm_source 우선 (마케팅 링크 박은 명시적 신호)
 *   - 없으면 referrer 호스트 단순화 (naver/daum/instagram 등)
 *   - 둘 다 없으면 'direct'
 *   - 내부 페이지 이동(같은 도메인 referrer) 이면 캡처 안 함
 *   - 이미 쿠키 있으면 덮어쓰지 않음 (first-touch 유지)
 */
const COOKIE_NAME = "pm_signup_source";
const COOKIE_TTL_DAYS = 30;

function simplifyHost(hostname: string): string | null {
  const h = hostname.toLowerCase();
  if (h.includes("daum.net") || h.includes("daum.com")) return "daum";
  if (h.includes("naver.com") || h.includes("naver.me")) return "naver";
  if (h.includes("instagram.com")) return "instagram";
  if (h.includes("facebook.com") || h.includes("fb.com")) return "facebook";
  if (h.includes("google.")) return "google";
  if (h.includes("youtube.com") || h.includes("youtu.be")) return "youtube";
  if (h.includes("kakao.com") || h.includes("kakaocdn.net")) return "kakao";
  if (h.includes("tistory.com")) return "tistory";
  if (h.includes("velog.io")) return "velog";
  return `ref:${h.replace(/^www\./, "")}`;
}

function hasCookie(name: string): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${name}=`));
}

export function SignupSourceTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // first-touch: 이미 박힌 쿠키 있으면 그대로 유지
    if (hasCookie(COOKIE_NAME)) return;

    const url = new URL(window.location.href);
    const utmSource = url.searchParams.get("utm_source");

    let source: string | null = null;

    if (utmSource) {
      // utm 우선 — 마케팅 링크의 명시적 신호
      source = utmSource;
    } else if (document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        // 내부 페이지 이동이면 캡처 안 함
        if (refUrl.hostname === window.location.hostname) return;
        source = simplifyHost(refUrl.hostname);
      } catch {
        // ignore — invalid referrer
      }
    } else {
      source = "direct";
    }

    if (!source) return;

    const value = encodeURIComponent(source);
    const maxAge = COOKIE_TTL_DAYS * 24 * 60 * 60;
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; samesite=lax${secure}`;
  }, []);

  return null;
}
