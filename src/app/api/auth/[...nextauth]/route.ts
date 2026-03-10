import NextAuth from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";
import { findOrCreateKakaoUser, setSession } from "@/lib/auth";

const kakaoId = process.env.KAKAO_CLIENT_ID;
const kakaoSecret = process.env.KAKAO_CLIENT_SECRET;

const handler = NextAuth({
  providers: kakaoId && kakaoSecret
    ? [
        KakaoProvider({
          clientId: kakaoId,
          clientSecret: kakaoSecret,
        }),
      ]
    : [],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "kakao" && profile) {
        const kakaoProfile = profile as { id?: number; properties?: { nickname?: string; profile_image?: string } };
        const session = await findOrCreateKakaoUser({
          id: String(kakaoProfile.id ?? user.id),
          nickname: kakaoProfile.properties?.nickname ?? user.name ?? "사용자",
          profileImage: kakaoProfile.properties?.profile_image ?? user.image ?? undefined,
        });
        await setSession(session);
      }
      return true;
    },
    async redirect({ baseUrl }) {
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export { handler as GET, handler as POST };
