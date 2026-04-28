import type { MetadataRoute } from "next";

/**
 * 검색 엔진 크롤러 가이드.
 *
 * 인증이 필요한 영역은 GoogleBot이 크롤링해도 로그인 화면(redirect)만 받아 가서
 * "크롤링됨 — 현재 색인 미생성" 카운트만 늘림. 명시적으로 disallow 해서 차단.
 *
 * 공개 색인 대상: /login (랜딩), /guide (사용자 가이드), /privacy, /terms
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/dashboard/",
        "/matches",
        "/matches/",
        "/members",
        "/members/",
        "/dues",
        "/dues/",
        "/settings",
        "/settings/",
        "/board",
        "/board/",
        "/records",
        "/records/",
        "/team",
        "/team/",
        "/onboarding",
        "/onboarding/",
        "/player",
        "/player/",
        "/more",
        "/more/",
        "/dev/",
        "/push-test",
        "/offline",
      ],
    },
    sitemap: "https://pitch-master.app/sitemap.xml",
  };
}
