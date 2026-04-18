import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Bebas_Neue } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

// Next.js 16: 내부 페이지(/_global-error, /_not-found) 정적 생성 시 workUnitAsyncStorage 오류 방지
export const dynamic = "force-dynamic";

const GA_ID = "G-XWRB861513";

// 대시보드/기록 페이지의 숫자 디스플레이에만 사용. display: swap으로 render-blocking 회피.
const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display-bebas",
  preload: false,
});

export const metadata: Metadata = {
  title: "PitchMaster — 조기축구 · 풋살 팀 관리 플랫폼",
  description: "실시간 참석투표, AI 라인업, 통장 캡쳐 회비 자동정리, 기록 분석, 카카오톡 공유까지. 조기축구 · 풋살 팀 운영을 한 곳에서.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://pitch-master.app"),
  verification: {
    google: "google0cfbdfe7b13f49fc",
  },
  keywords: ["조기축구", "팀 관리", "참석 투표", "회비 관리", "전술판", "축구 기록", "MVP", "조기축구 앱"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PitchMaster",
  },
  openGraph: {
    title: "PitchMaster — 조기축구 · 풋살 팀 관리 플랫폼",
    description: "실시간 참석투표, AI 라인업, 통장 캡쳐 회비 자동정리, 기록 분석까지. 조기축구 팀 운영을 한 곳에서.",
    url: "https://pitch-master.app",
    siteName: "PitchMaster",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PitchMaster — 조기축구 · 풋살 팀 관리 플랫폼",
    description: "실시간 참석투표, AI 라인업, 회비 자동정리, 기록 분석까지.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://pitch-master.app",
  },
};

export const viewport: Viewport = {
  themeColor: "#e8613a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* FOUC 방지: 페이지 로드 전 테마 즉시 적용 */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');var d;if(t==='dark')d=true;else if(t==='light')d=false;else d=true;if(!d){var s=document.createElement('style');s.id='pm-theme-light';s.textContent=':root{--background:220 14% 96%;--foreground:220 20% 14%;--card:0 0% 100%;--card-foreground:220 20% 14%;--popover:0 0% 100%;--popover-foreground:220 20% 14%;--primary:16 85% 48%;--primary-foreground:0 0% 100%;--secondary:220 12% 91%;--secondary-foreground:220 10% 30%;--muted:220 12% 93%;--muted-foreground:220 8% 42%;--accent:40 65% 46%;--accent-foreground:0 0% 100%;--destructive:0 72% 46%;--destructive-foreground:0 0% 100%;--border:220 12% 84%;--input:220 12% 84%;--ring:16 85% 48%;--success:152 60% 34%;--warning:38 90% 44%;--info:210 75% 42%;--win:152 60% 34%;--draw:220 8% 54%;--loss:0 68% 44%;--pitch:152 45% 32%;--sidebar-background:220 14% 94%;--sidebar-foreground:220 20% 14%;--sidebar-primary:16 85% 48%;--sidebar-primary-foreground:0 0% 100%;--sidebar-accent:220 12% 91%;--sidebar-accent-foreground:220 10% 30%;--sidebar-border:220 12% 84%;--sidebar-ring:16 85% 48%}';document.head.appendChild(s)}}catch(e){}})()` }} />
        {/* Pretendard: npm 패키지에서 로컬 로드 (CORS 이슈 해결) */}
        <link rel="dns-prefetch" href="https://t1.kakaocdn.net" />
        <link rel="preconnect" href="https://t1.kakaocdn.net" crossOrigin="anonymous" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${bebasNeue.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "PitchMaster",
              "applicationCategory": "SportsApplication",
              "operatingSystem": "Web",
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "KRW" },
              "description": "조기축구·풋살 팀 관리 서비스 — 참석 투표, 회비 관리, AI 라인업",
              "url": "https://pitch-master.app"
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                { "@type": "Question", "name": "정말 무료인가요?", "acceptedAnswer": { "@type": "Answer", "text": "네, 현재는 무료입니다. 추후 운영에 따라서 변동이 있을 수 있습니다." } },
                { "@type": "Question", "name": "우리 팀 데이터는 안전한가요?", "acceptedAnswer": { "@type": "Answer", "text": "한국 서울 리전에 암호화 저장됩니다." } },
                { "@type": "Question", "name": "인원 제한이 있나요?", "acceptedAnswer": { "@type": "Answer", "text": "없습니다. 몇 명이든 사용 가능합니다." } },
                { "@type": "Question", "name": "풋살도 되나요?", "acceptedAnswer": { "@type": "Answer", "text": "네, 축구와 풋살 모두 지원합니다. 3~8인제 포메이션까지 지원합니다." } },
              ]
            })
          }}
        />
        {children}
        <ServiceWorkerRegister />
        <Script id="chunk-error-handler" strategy="beforeInteractive">
          {`function _cr(e){var m=e&&(e.message||e.reason&&e.reason.message||'');if(m.includes('ChunkLoadError')||m.includes('Loading chunk')||m.includes('Failed to fetch')){window.location.reload();}}window.addEventListener('error',_cr,true);window.addEventListener('unhandledrejection',function(e){_cr(e.reason);});`}
        </Script>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
        </Script>
      </body>
    </html>
  );
}
