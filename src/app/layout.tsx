import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Bebas_Neue } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { GAPageTracker } from "@/components/GAPageTracker";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

// Next.js 16: 내부 페이지(/_global-error, /_not-found) 정적 생성 시 workUnitAsyncStorage 오류 방지
export const dynamic = "force-dynamic";

const GA_ID = "G-XWRB861513";

// 대시보드/기록 페이지의 숫자 디스플레이에 사용. display: swap 으로 render-blocking 회피.
// preload: true — latin subset 1개라 비용 작고, stat 숫자 카드 폰트 swap 깜빡임 줄어듦.
const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display-bebas",
  preload: true,
});

export const metadata: Metadata = {
  title: "PitchMaster — 조기축구 · 풋살 팀 관리 플랫폼",
  description: "실시간 참석투표, AI 라인업, 통장 캡쳐 회비 자동정리, 기록 분석, 카카오톡 공유까지. 조기축구 · 풋살 팀 운영을 한 곳에서.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://pitch-master.app"),
  verification: {
    google: "google0cfbdfe7b13f49fc",
    other: {
      // www.pitch-master.app (기존) + pitch-master.app (루트, sitemap 제출용)
      "naver-site-verification": [
        "78534dae19992e874725d2ae546c0c4e1ca835e6",
        "0cb429e0cb2d276976702e8e77ed36baa2744748",
      ],
    },
  },
  keywords: [
    "피치마스터", "PitchMaster", "pitch master",
    "조기축구", "조기축구 앱", "조기축구 팀관리", "조기축구 총무",
    "축구팀 관리", "축구팀 매니저", "축구 회비",
    "풋살 팀관리", "풋살 매니저", "풋살 회비",
    "참석 투표", "회비 관리", "회비 OCR", "통장 캡처",
    "전술판", "AI 라인업", "AI 전술", "축구 기록", "MVP 투표",
    "조기축구회 운영", "팀관리 웹앱", "무료 팀 관리",
  ],
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
                { "@type": "Question", "name": "정말 무료인가요?", "acceptedAnswer": { "@type": "Answer", "text": "네, 현재는 무료입니다. 인원 제한도 없습니다. 추후 운영에 따라 변동이 있을 수 있습니다." } },
                { "@type": "Question", "name": "우리 팀 데이터는 안전한가요?", "acceptedAnswer": { "@type": "Answer", "text": "한국 서울 리전에 암호화 저장됩니다. 카카오 로그인만 사용하며, 별도 비밀번호를 보관하지 않습니다." } },
                { "@type": "Question", "name": "축구와 풋살 둘 다 되나요?", "acceptedAnswer": { "@type": "Answer", "text": "네, 팀 생성 시 종목을 선택하면 포지션·전술판·코트 비율이 자동으로 맞춰집니다. 풋살은 3인제부터 8인제까지 완전 지원합니다." } },
                { "@type": "Question", "name": "조기축구 총무를 처음 맡았는데 어디서부터 시작하나요?", "acceptedAnswer": { "@type": "Answer", "text": "팀 생성 → 초대 링크로 팀원 등록 → 첫 경기 일정 등록, 세 단계면 됩니다. 회비는 통장 캡처 한 장으로 자동 정리되고, 참석 투표는 카카오톡 공유 한 번으로 끝납니다." } },
                { "@type": "Question", "name": "통장 캡처로 회비 정리가 어떻게 되나요?", "acceptedAnswer": { "@type": "Answer", "text": "카카오뱅크·토스 등 거래 내역 화면을 캡처해 올리면 AI가 날짜·이름·금액을 자동 추출해 표로 만들어줍니다. 총무는 납부자 매칭만 확인하면 됩니다." } },
                { "@type": "Question", "name": "PC에서도 쓸 수 있나요?", "acceptedAnswer": { "@type": "Answer", "text": "네, PWA 기반이라 PC·태블릿·폰 어디서나 바로 사용합니다. 앱 설치 없이 브라우저로 접속 가능합니다." } },
                { "@type": "Question", "name": "AI 라인업 자동 편성은 어떻게 작동하나요?", "acceptedAnswer": { "@type": "Answer", "text": "참석자와 포메이션만 있으면 AI가 쿼터별 배치와 감독 작전 브리핑까지 같이 생성합니다. 팀 과거 이력·선수별 스탯·상대팀 맞대결 기록을 모두 반영합니다." } },
              ]
            })
          }}
        />
        {children}
        <GAPageTracker />
        <ServiceWorkerRegister />
        <Script id="chunk-error-handler" strategy="beforeInteractive">
          {`function _cr(e){var m=e&&(e.message||e.reason&&e.reason.message||'');if(m.includes('ChunkLoadError')||m.includes('Loading chunk')||m.includes('Failed to fetch')){window.location.reload();}}window.addEventListener('error',_cr,true);window.addEventListener('unhandledrejection',function(e){_cr(e.reason);});`}
        </Script>
        {/* gtag-init은 afterInteractive로 빨리 로드해 dataLayer/gtag stub을 정의.
            외부 gtag.js 본체는 lazyOnload로 미루어 LCP 메인스레드 점유를 줄이되,
            그 사이 page_view는 dataLayer 큐에 쌓였다가 본체 로드 후 발화된다 (GA 표준 동작). */}
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:false});`}
        </Script>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="lazyOnload" />
      </body>
    </html>
  );
}
