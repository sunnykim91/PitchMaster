import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.KAKAO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Kakao OAuth not configured" }, { status: 503 });
  }
  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/kakao/callback`;
  const inviteCode = request.nextUrl.searchParams.get("inviteCode") ?? "";
  const state = inviteCode ? encodeURIComponent(inviteCode) : "";
  // scope 파라미터: 추가 동의 요청 시 사용 (예: ?scope=profile_image)
  const scope = request.nextUrl.searchParams.get("scope") ?? "";
  let url = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  if (state) url += `&state=${state}`;
  if (scope) url += `&scope=${encodeURIComponent(scope)}`;
  return NextResponse.redirect(url);
}
