/**
 * Next.js Middleware — CSRF 보호
 *
 * state-changing HTTP 메서드(POST/PUT/PATCH/DELETE)에 대해
 * Origin 헤더(또는 폴백으로 Referer)를 화이트리스트와 비교해
 * 외부 도메인에서 교차사이트로 위조된 요청을 차단한다.
 *
 * - GET/HEAD/OPTIONS 는 멱등이라 통과
 * - Vercel Cron · 카카오 OAuth 콜백은 모두 GET 이라 영향 없음
 * - 외부 webhook POST 엔드포인트는 현재 없음 (전부 내부 호출)
 */

import { NextResponse, type NextRequest } from "next/server";

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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

export function middleware(req: NextRequest) {
  const method = req.method.toUpperCase();
  if (!STATE_CHANGING.has(method)) return NextResponse.next();

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
