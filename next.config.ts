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
      { protocol: "http", hostname: "k.kakaocdn.net" },
      { protocol: "https", hostname: "k.kakaocdn.net" },
      { protocol: "http", hostname: "*.kakaocdn.net" },
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
  async redirects() {
    return [
      // canonical 도메인 통일 — www.pitch-master.app → pitch-master.app (영구)
      // Search Console에서 "리디렉션이 포함된 페이지" / "리디렉션 오류" 정리 목적.
      // http → https 는 Vercel 단에서 자동 처리되므로 별도 룰 불필요.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.pitch-master.app" }],
        destination: "https://pitch-master.app/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
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
