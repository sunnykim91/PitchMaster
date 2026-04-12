import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.KAKAO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Kakao OAuth not configured" }, { status: 503 });
  }
  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/kakao/callback`;
  const inviteCode = request.nextUrl.searchParams.get("inviteCode") ?? "";
  const scope = request.nextUrl.searchParams.get("scope") ?? "";
  const redirectAfter = request.nextUrl.searchParams.get("redirect") ?? "";

  // state에 inviteCode 또는 redirect 경로를 담음 (callback에서 꺼냄)
  let stateValue = "";
  if (inviteCode) stateValue = inviteCode;
  else if (redirectAfter) stateValue = `__redirect__${redirectAfter}`;
  const state = stateValue ? encodeURIComponent(stateValue) : "";

  let url = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  if (state) url += `&state=${state}`;
  if (scope) url += `&scope=${encodeURIComponent(scope)}`;
  return NextResponse.redirect(url);
}
