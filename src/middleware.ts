/**
 * Next.js Middleware — CSRF 보호 + signup_source server fallback
 *
 * 1) state-changing HTTP 메서드(POST/PUT/PATCH/DELETE) CSRF 보호 (기존)
 *    - Origin/Referer 화이트리스트
 *    - GET/HEAD/OPTIONS는 멱등이라 통과
 *
 * 2) GET 요청에 한해 signup_source server fallback (2026-05-18 추가)
 *    - 외부 cross-site 첫 진입 + pm_signup_source 쿠키 없을 때만 Set-Cookie
 *    - 클라이언트 SignupSourceTracker가 useEffect 못 돌린 케이스 보강
 *      (카톡 인앱·useEffect 마운트 전 jump 등)
 *    - first-touch 정책 유지 — 이미 쿠키 있으면 안 덮어씀
 *    - Sec-Fetch-Site 헤더로 외부 진입만 정확히 잡아 매 요청 부하 최소화
 */

import { NextResponse, type NextRequest } from "next/server";

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SIGNUP_SOURCE_COOKIE = "pm_signup_source";
const SIGNUP_SOURCE_TTL_DAYS = 30;

function isAllowedHost(host: string): boolean {
  // 프로덕션
  if (host === "pitch-master.app" || host === "www.pitch-master.app") return true;
  // Vercel preview deploy — `pitch-master-git-<branch>-<org>.vercel.app` 형태
  if (host.endsWith(".vercel.app")) return true;
  // 로컬 개발
  if (host === "localhost" || host.startsWith("localhost:")) return true;
  if (host === "127.0.0.1" || host.startsWith("127.0.0.1:")) return true;
  return false;
}

function isAllowedUrl(raw: string): boolean {
  try {
    return isAllowedHost(new URL(raw).host);
  } catch {
    return false;
  }
}

/** Referer 호스트를 간단한 source 라벨로 정규화 (SignupSourceTracker와 1:1) */
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

/** signup_source 서버 fallback — GET 요청에서만, 쿠키 없고 외부 진입일 때만 */
function maybeSetSignupSource(req: NextRequest, res: NextResponse): NextResponse {
  // 이미 쿠키 있으면 first-touch 보존 — 절대 덮어쓰지 않음
  if (req.cookies.get(SIGNUP_SOURCE_COOKIE)) return res;

  // 외부 cross-site 진입만 처리. same-origin/same-site는 SignupSourceTracker가
  // 곧 클라이언트에서 'direct'/내부무시 처리하므로 server에서 손대지 않음.
  const sfs = req.headers.get("sec-fetch-site");
  if (sfs && sfs !== "cross-site" && sfs !== "none") return res;

  // utm_source 우선 (마케팅 명시 신호)
  const utm = req.nextUrl.searchParams.get("utm_source");
  let source: string | null = utm ? utm.slice(0, 100) : null;

  // utm 없으면 Referer 호스트로 폴백
  if (!source) {
    const ref = req.headers.get("referer");
    if (ref) {
      try {
        const u = new URL(ref);
        // TWA(android-app://app.pitchmaster) referrer는 무시 — 외부 웹 referrer 아님
        // (TWA 사용자가 OAuth 가입 시 잘못된 source가 박히는 사고 방지)
        if (u.protocol.startsWith("android-app")) {
          return res;
        }
        // 내부 referrer도 무시 — 외부에서 온 첫 진입만 의미 있음
        if (!isAllowedHost(u.host)) {
          source = simplifyHost(u.host);
        }
      } catch {
        // ignore — invalid referer
      }
    }
  }

  if (!source) return res;

  // Set-Cookie — SignupSourceTracker와 동일 형식 (SameSite=lax, 30일)
  res.cookies.set({
    name: SIGNUP_SOURCE_COOKIE,
    value: encodeURIComponent(source),
    maxAge: SIGNUP_SOURCE_TTL_DAYS * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
  });
  return res;
}

export function middleware(req: NextRequest) {
  const method = req.method.toUpperCase();

  // GET/HEAD/OPTIONS — signup_source fallback만 시도하고 통과
  if (!STATE_CHANGING.has(method)) {
    if (method === "GET") {
      return maybeSetSignupSource(req, NextResponse.next());
    }
    return NextResponse.next();
  }

  // 이하 기존 CSRF 검사 (POST/PUT/PATCH/DELETE) — 동작 변경 X
  const origin = req.headers.get("origin");
  if (origin) {
    return isAllowedUrl(origin)
      ? NextResponse.next()
      : NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  // Origin 누락 시 Referer 폴백 — 일부 구형 환경 또는 PWA 특수 케이스
  const referer = req.headers.get("referer");
  if (referer) {
    return isAllowedUrl(referer)
      ? NextResponse.next()
      : NextResponse.json({ error: "forbidden_referer" }, { status: 403 });
  }

  // Origin/Referer 둘 다 없으면 CSRF 의심으로 거부.
  // 서버 내부 호출은 middleware 를 거치지 않으므로 영향 없음.
  return NextResponse.json({ error: "missing_origin" }, { status: 403 });
}

/** 정적 자산·PWA 관련 리소스는 미들웨어 제외 (성능). */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*|icons/|screenshots/|screenshot/).*)",
  ],
};
