import type { NextConfig } from "next";
import { execSync } from "child_process";

const commitHash = (() => {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  }
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
})();

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  env: {
    NEXT_PUBLIC_COMMIT_HASH: commitHash,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-tabs"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "k.kakaocdn.net" },
      { protocol: "https", hostname: "*.kakaocdn.net" },
    ],
  },
  async rewrites() {
    return [
      // /guide 로 접근 시 public/guide.html 서빙 (확장자 없는 깔끔한 URL)
      // 향후 Next.js 페이지로 완전 마이그레이션 시 제거 (계획: docs/pre-launch-checklist.md)
      { source: "/guide", destination: "/guide.html" },
    ];
  },
  // ⚠️ www → non-www redirect 는 Vercel/Cloudflare 단에서 처리 중. next.config 에서
  // 동일 룰 추가 시 두 시스템이 핑퐁 → ERR_TOO_MANY_REDIRECTS. 절대 다시 추가 금지.
  // canonical 통일 필요 시 Vercel 도메인 설정 또는 Cloudflare Page Rule 에서만 변경.
  async headers() {
    // dev 모드에서는 Cache-Control 적용 안 함 — Turbopack HMR 과 hydration 깨짐 방지.
    // (Next.js 16 가 경고: "Custom Cache-Control headers can break dev behavior")
    // stale HTML 이 60초 캐시되어 코드 변경 후에도 옛 SSR 결과로 hydration mismatch 발생.
    if (process.env.NODE_ENV !== "production") return [];
    return [
      {
        // 정적 에셋 (JS/CSS/폰트/이미지) - 해시가 포함되어 있으므로 장기 캐시
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // HTML 페이지 - 캐시하되 백그라운드에서 최신 버전 확인
        source: "/((?!api|_next/static).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=60, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
