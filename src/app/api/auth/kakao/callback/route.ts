import { NextRequest, NextResponse } from "next/server";
import { findOrCreateKakaoUser, setSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url));
  }

  const clientId = process.env.KAKAO_CLIENT_ID!;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/kakao/callback`;

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL("/login?error=token_fail", request.url));
    }

    // Get user info
    const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    let session;
    try {
      session = await findOrCreateKakaoUser({
        id: String(userData.id),
        nickname: userData.properties?.nickname ?? "사용자",
        profileImage: userData.properties?.profile_image,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "ACCOUNT_BLOCKED") {
        return NextResponse.redirect(new URL("/login?error=blocked", request.url));
      }
      throw e;
    }

    await setSession(session);
    const stateRaw = request.nextUrl.searchParams.get("state") ?? "";
    const stateDecoded = stateRaw ? decodeURIComponent(stateRaw) : "";

    let redirectUrl = "/";
    if (stateDecoded.startsWith("__redirect__")) {
      // 카카오 추가 동의 후 특정 페이지로 복귀
      redirectUrl = stateDecoded.replace("__redirect__", "") || "/settings";
    } else if (stateDecoded) {
      // 초대 코드
      redirectUrl = `/?inviteCode=${encodeURIComponent(stateDecoded)}`;
    }
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=auth_fail", request.url));
  }
}
