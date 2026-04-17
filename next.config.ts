import type { NextConfig } from "next";
import { execSync } from "child_process";

const commitHash = (() => {
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
