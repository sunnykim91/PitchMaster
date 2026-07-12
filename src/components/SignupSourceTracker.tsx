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
const REF_COOKIE = "pm_ref"; // 추천 리워드 — 추천인 user_id (?ref=)
const COOKIE_TTL_DAYS = 30;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function normalizeUtmSource(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (v === "ig" || v === "insta" || v === "instagram") return "instagram";
  if (v === "fb" || v === "facebook" || v === "meta") return "facebook";
  if (v === "kakao" || v === "kakaotalk" || v === "kt") return "kakao";
  if (v === "naver") return "naver";
  if (v === "daum") return "daum";
  if (v === "google") return "google";
  if (v === "youtube" || v === "yt") return "youtube";
  if (v === "tistory") return "tistory";
  if (v === "velog") return "velog";
  return v;
}

function hasCookie(name: string): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${name}=`));
}

/**
 * 동기 캡처 함수 — useEffect 마운트 전에 jump하는 케이스(빠른 클릭)
 * 보강용. KakaoLoginLink onClick에서도 호출돼 first-touch 누락 최소화.
 *
 * 정책 동일:
 *  - 이미 쿠키 있으면 그대로 (first-touch 보존)
 *  - utm > referrer 호스트 > 'direct' 순
 *  - 내부 referrer는 무시
 */
export function captureSignupSourceIfMissing() {
  if (typeof window === "undefined") return;
  if (hasCookie(COOKIE_NAME)) return;

  const url = new URL(window.location.href);
  const utmSource = url.searchParams.get("utm_source");

  let source: string | null = null;

  if (utmSource) {
    source = normalizeUtmSource(utmSource);
  } else if (document.referrer) {
    try {
      const refUrl = new URL(document.referrer);
      if (refUrl.hostname === window.location.hostname) return;
      source = simplifyHost(refUrl.hostname);
    } catch {
      // ignore
    }
  } else {
    source = "direct";
  }

  if (!source) return;

  const value = encodeURIComponent(source);
  const maxAge = COOKIE_TTL_DAYS * 24 * 60 * 60;
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; samesite=lax${secure}`;
}

/**
 * 추천 링크 캡처 — ?ref=<추천인 user_id> 를 쿠키(pm_ref)에 first-touch 저장.
 * 카카오 콜백에서 신규가입 시 읽어 referrals 귀속. UUID 형태만 허용(오염 방지).
 */
export function captureRefIfMissing() {
  if (typeof window === "undefined") return;
  if (hasCookie(REF_COOKIE)) return;
  const ref = new URL(window.location.href).searchParams.get("ref");
  if (!ref || !UUID_RE.test(ref)) return;
  const maxAge = COOKIE_TTL_DAYS * 24 * 60 * 60;
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${REF_COOKIE}=${encodeURIComponent(ref)}; path=/; max-age=${maxAge}; samesite=lax${secure}`;
}

export function SignupSourceTracker() {
  useEffect(() => {
    captureSignupSourceIfMissing();
    captureRefIfMissing();
  }, []);

  return null;
}
