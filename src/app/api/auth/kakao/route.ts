import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.KAKAO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Kakao OAuth not configured" }, { status: 503 });
  }
  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/kakao/callback`;
  const inviteCode = request.nextUrl.searchParams.get("inviteCode") ?? "";
  const state = inviteCode ? encodeURIComponent(inviteCode) : "";
  let url = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  if (state) url += `&state=${state}`;
  return NextResponse.redirect(url);
}
