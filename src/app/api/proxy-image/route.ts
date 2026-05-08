import { NextRequest, NextResponse } from "next/server";
import { getApiContext } from "@/lib/api-helpers";

/**
 * 이미지 프록시 — 카카오 CDN 등 CORS 헤더 없는 외부 이미지를
 * html-to-image 캡처가 가능하도록 같은 오리진으로 전달.
 *
 * 보안 가드:
 *  - 인증된 사용자만 호출 가능 (ShareCard 캡처 흐름 한정)
 *  - 정확 host 매칭만 (subdomain 와일드카드 제거 — 다른 사용자의 Supabase 프로젝트 차단)
 *  - IP literal·localhost 차단 (SSRF 표면 좁힘)
 *  - 5초 타임아웃 + image/* content-type 검증 (기존)
 *
 * GET /api/proxy-image?url=https://k.kakaocdn.net/...
 */

// 자기 Supabase 프로젝트 호스트만 허용. 빌드 시점에 env 에서 추출.
const SUPABASE_HOST = (() => {
  try {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return u ? new URL(u).hostname : null;
  } catch {
    return null;
  }
})();

const ALLOWED_HOSTS = new Set<string>(
  [
    "k.kakaocdn.net",
    "img1.kakaocdn.net",
    "ssl.pstatic.net",
    SUPABASE_HOST,
  ].filter((h): h is string => Boolean(h)),
);

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const urlParam = request.nextUrl.searchParams.get("url");
  if (!urlParam) return NextResponse.json({ error: "url required" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  // IP literal·localhost 차단 (내부망/메타데이터 서비스 SSRF 차단)
  const host = parsed.hostname.toLowerCase();
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || /^\[?[0-9a-f:]+\]?$/.test(host) || host === "localhost") {
    return NextResponse.json({ error: "host not allowed" }, { status: 403 });
  }

  // 정확 host 매칭만 — subdomain 와일드카드 제거로 다른 사용자 Supabase 프로젝트 차단
  if (!ALLOWED_HOSTS.has(host)) {
    return NextResponse.json({ error: "host not allowed" }, { status: 403 });
  }

  // https 강제
  if (parsed.protocol !== "https:") {
    return NextResponse.json({ error: "https required" }, { status: 403 });
  }

  try {
    const upstream = await fetch(urlParam, {
      headers: { "User-Agent": "PitchMaster-ImageProxy" },
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
    }
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "not an image" }, { status: 415 });
    }
    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
