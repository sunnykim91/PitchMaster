import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PitchMaster — 조기축구 · 풋살 팀 관리 플랫폼",
  description: "실시간 참석투표, AI 라인업, 통장 캡쳐 회비 자동정리, 기록 분석, 카카오톡 공유까지. 조기축구 · 풋살 팀 운영을 한 곳에서.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://pitch-master-eight.vercel.app"),
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
    url: "https://pitch-master-eight.vercel.app",
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
    canonical: "https://pitch-master-eight.vercel.app",
  },
};

export const viewport: Viewport = {
  themeColor: "#22c55e",
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
    <html lang="ko" className="dark">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
