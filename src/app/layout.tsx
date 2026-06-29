import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Bebas_Neue } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { GAPageTracker } from "@/components/GAPageTracker";
import { SignupSourceTracker } from "@/components/SignupSourceTracker";
import TwaReferrerCapture from "@/components/TwaReferrerCapture";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

// 인증 영역만 (app)/layout.tsx 에서 force-dynamic 명시.
// root 에서 강제하면 정적 가능한 랜딩(/login·/pricing 등)까지 매 요청 SSR 부담.

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
  // SEO: 한글 핵심 키워드(조기축구·풋살 팀 관리 앱)를 prefix 로 두어 네이버 검색결과
  // 첫 단어 매칭 후크 강화. 영어 브랜드명은 suffix 로 이동 (조기싸커 1위 패턴 차용).
  title: "조기축구·풋살 팀 관리 앱 — 회비·출석·전술판 무료 | 피치마스터 PitchMaster",
  // 사실 검증된 기능만 사용: 통장 캡처 OCR (aiOcrParse), 휴회·부상 자동 면제 (member_status),
  // 미투표 벌금 (no-vote-penalty cron). "단톡방 대신" painPoint 우선 노출.
  description: "조기축구·풋살 팀 무료 관리 앱. 카카오톡 단톡방 대신 출석·회비·전술판·시즌 통계를 한 곳에서. 통장 캡처 OCR 회비 정리, 휴회·부상 자동 면제, 미투표 벌금 자동 청구까지.",
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
    "전술판", "전술 보드", "전술판 앱", "풋살 전술판", "풋살 전술판앱", "축구 전술판",
    "전술 영상", "전술 애니메이션", "축구 전술 영상", "풋살 전술 영상", "전술 영상 편집",
    "AI 라인업", "AI 전술", "AI 코치", "AI 자동 편성",
    "축구 기록", "MVP 투표",
    "조기축구회 운영", "팀관리 웹앱", "무료 팀 관리",
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PitchMaster",
  },
  openGraph: {
    title: "조기축구·풋살 팀 관리 앱 — 회비·출석·전술판 무료 | 피치마스터 PitchMaster",
    description: "조기축구·풋살 팀 무료 관리 앱. 카카오톡 단톡방 대신 출석·회비·전술판·시즌 통계를 한 곳에서. 통장 캡처 OCR 회비 정리, 휴회·부상 자동 면제까지.",
    url: "https://pitch-master.app",
    siteName: "피치마스터 PitchMaster",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "조기축구·풋살 팀 관리 앱 — 무료 | 피치마스터 PitchMaster",
    description: "카카오톡 단톡방 대신 출석·회비·전술판을 한 곳에서. 통장 캡처 OCR, 휴회·부상 자동 면제, 미투표 벌금 자동까지.",
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
  // iOS 노치/홈인디케이터 safe-area를 env()로 보고받기 위함 (globals.css의 body 상·하 패딩 활성화)
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* FOUC 방지: 페이지 로드 전 :root.light 클래스 토글로 라이트 모드 즉시 반영. 토큰 값은 globals.css `:root.light` 단일 정의 참조 */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}})()` }} />
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
              "name": "피치마스터 PitchMaster",
              "applicationCategory": "SportsApplication",
              "operatingSystem": "Android, Web",
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "KRW" },
              "description": "조기축구·풋살 팀 관리 서비스 — 참석 투표, 회비 관리, AI 라인업",
              "url": "https://pitch-master.app",
              "downloadUrl": "https://play.google.com/store/apps/details?id=app.pitchmaster",
              "installUrl": "https://play.google.com/store/apps/details?id=app.pitchmaster"
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
                { "@type": "Question", "name": "정말 무료인가요?", "acceptedAnswer": { "@type": "Answer", "text": "네, 현재는 모든 기능이 무료입니다. 광고도 없습니다." } },
                { "@type": "Question", "name": "어떻게 시작하나요?", "acceptedAnswer": { "@type": "Answer", "text": "카카오로 1분 안에 가입 → 팀 만들기 → 초대 링크 공유. 팀원은 초대 링크에서 카카오 로그인만 하면(따로 가입 절차 없이) 바로 참석 투표할 수 있습니다." } },
                { "@type": "Question", "name": "네이버 밴드나 단톡방을 꼭 끊어야 하나요?", "acceptedAnswer": { "@type": "Answer", "text": "아니요. 밴드·단톡방은 그대로 두고, 매주 반복되는 운영(출석 투표·회비 정산·라인업·기록)만 PitchMaster로 옮기는 팀이 많습니다. 사진·잡담·공지 같은 소통은 익숙한 단톡방에서 계속하고, 총무를 가장 힘들게 하는 운영 업무만 자동으로 처리하는 보조 운영툴로 쓰는 게 가장 부담이 없습니다." } },
                { "@type": "Question", "name": "기존 팀 데이터를 옮길 수 있나요?", "acceptedAnswer": { "@type": "Answer", "text": "엑셀·시트로 정리된 회비/명단은 한 번에 import 가능합니다. 카톡 출석 기록은 자동 변환은 어렵고 처음부터 PitchMaster에서 쌓는 걸 추천드립니다." } },
                { "@type": "Question", "name": "AI 라인업은 어떻게 동작하나요?", "acceptedAnswer": { "@type": "Answer", "text": "참석자 명단·선호 포지션·과거 경기 기록·상대팀 이력을 분석해 포메이션과 쿼터별 출전을 자동 추천합니다. 이건 다른 운영 앱에 없는 기능입니다." } },
                { "@type": "Question", "name": "우리 팀만의 전술 영상도 만들 수 있나요?", "acceptedAnswer": { "@type": "Answer", "text": "네, 운영진이 선수 위치를 직접 그려 우리 팀 빌드업·수비 흐름을 영상처럼 만들 수 있습니다. 만든 영상은 경기 역할 가이드에서 팀원들이 자동으로 보게 됩니다. 축구 11명·풋살 5~8명 모두 지원합니다." } },
                { "@type": "Question", "name": "회비 OCR이 정확한가요?", "acceptedAnswer": { "@type": "Answer", "text": "은행 앱 캡처를 올리면 입금자명·금액을 자동 인식해 명단과 매칭합니다. 휴면·부상 회원은 자동 면제 처리됩니다." } },
                { "@type": "Question", "name": "축구뿐 아니라 풋살도 되나요?", "acceptedAnswer": { "@type": "Answer", "text": "네, 풋살 전용 포지션·전술판·역할 가이드가 별도로 지원됩니다. 주로 5·6인제에 최적화되어 있고, 다른 인원수도 운영 가능합니다. 한 팀에서 축구·풋살을 같이 운영하는 경우도 OK입니다." } },
                { "@type": "Question", "name": "팀원이 카카오 계정이 없으면요?", "acceptedAnswer": { "@type": "Answer", "text": "참석 투표·개인 기록은 카카오 로그인이 필요합니다. 카카오 계정이 없는 팀원은 운영진이 명단에 등록해 출결을 대신 관리할 수 있고, 본인이 직접 투표·기록 확인을 하려면 카카오 로그인(무료·1분)만 하면 됩니다." } },
                { "@type": "Question", "name": "벌금은 자동으로 부과되나요?", "acceptedAnswer": { "@type": "Answer", "text": "지각·불참 자동 차감 규칙을 회칙에 명시하면, 매번 묻지 않아도 자동으로 회비에서 차감됩니다." } },
                { "@type": "Question", "name": "월별 결산은 어떻게 보나요?", "acceptedAnswer": { "@type": "Answer", "text": "월별 수입·지출·잔고가 자동 집계되어 한 화면에 보입니다. 팀원 공유용 요약 카드는 이미지로 저장하거나 카톡으로 바로 공유할 수 있습니다." } },
                { "@type": "Question", "name": "여러 팀을 동시에 운영할 수 있나요?", "acceptedAnswer": { "@type": "Answer", "text": "한 카카오 계정으로 여러 팀을 만들고 전환할 수 있습니다. 회장이 두 팀 운영하는 경우도 흔해서 초기부터 지원합니다." } },
                { "@type": "Question", "name": "안드로이드(갤럭시) 앱이 있나요?", "acceptedAnswer": { "@type": "Answer", "text": "네, Google Play 스토어에 정식 출시됐습니다. '피치마스터'를 검색하거나 스토어 링크로 설치하면 홈 화면 아이콘으로 바로 실행할 수 있습니다. 아이폰은 아직 별도 앱이 없지만, 사파리에서 '홈 화면에 추가'를 하면 앱처럼 사용할 수 있습니다. 어느 쪽이든 카카오 로그인이 같아 데이터는 그대로 유지됩니다." } },
                { "@type": "Question", "name": "PC에서도 쓸 수 있나요?", "acceptedAnswer": { "@type": "Answer", "text": "PC는 브라우저로 바로 쓸 수 있고, 휴대폰은 앱으로도 쓸 수 있습니다. 안드로이드(갤럭시 등)는 Google Play에서 '피치마스터'를 설치하면 되고, 아이폰은 홈 화면에 추가하면 앱처럼 사용됩니다. 어느 쪽이든 같은 계정·데이터로 이어집니다." } },
                { "@type": "Question", "name": "우리 팀 데이터는 안전한가요?", "acceptedAnswer": { "@type": "Answer", "text": "출석·회비·경기 기록은 한국 서울 리전에 암호화되어 보관되고, 권한이 있는 운영진만 접근할 수 있습니다. 카카오 로그인만 사용해 별도 비밀번호는 저장하지 않습니다. 월별 결산은 PDF·이미지로 저장해 앱과 별개로도 기록을 남길 수 있습니다." } },
                { "@type": "Question", "name": "팀 내부 자체전(홍백전)도 기록되나요?", "acceptedAnswer": { "@type": "Answer", "text": "네, 자체전은 인원을 2~3팀(A·B·C)으로 나눠 편성하고 팀별 점수와 개인 기록까지 남길 수 있습니다. 자체전 기록은 상대팀 전적과 분리되어 집계됩니다." } },
                { "@type": "Question", "name": "경기 사진을 모아둘 수 있나요?", "acceptedAnswer": { "@type": "Answer", "text": "네, 경기마다 사진을 올리면 게시판 앨범 탭에 자동으로 모여 팀원 누구나 지난 경기 사진을 한곳에서 볼 수 있습니다." } }
              ]
            })
          }}
        />
        {children}
        <GAPageTracker />
        <SignupSourceTracker />
        <TwaReferrerCapture />
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
