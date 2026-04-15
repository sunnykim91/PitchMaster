import { NextRequest, NextResponse } from "next/server";

/**
 * 이미지 프록시 — 카카오 CDN 등 CORS 헤더 없는 외부 이미지를
 * html-to-image 캡처가 가능하도록 같은 오리진으로 전달.
 *
 * GET /api/proxy-image?url=https://k.kakaocdn.net/...
 */
export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");
  if (!urlParam) return NextResponse.json({ error: "url required" }, { status: 400 });

  // 화이트리스트된 호스트만 허용 (보안: 내부망·임의 서버 프록시 방지)
  const ALLOWED_HOSTS = [
    "k.kakaocdn.net",
    "img1.kakaocdn.net",
    "ssl.pstatic.net",
    // Supabase Storage
    "supabase.co",
    "supabase.in",
  ];
  let parsed: URL;
  try {
    parsed = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  const hostOk =
    ALLOWED_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`));
  if (!hostOk) {
    return NextResponse.json({ error: "host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(urlParam, {
      headers: { "User-Agent": "PitchMaster-ImageProxy" },
      // 5초 타임아웃
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
