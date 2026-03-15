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
  title: "PitchMaster — 조기축구 팀 관리 플랫폼",
  description: "경기 일정, 참석 투표, 전술판, 회비 관리, MVP 기록까지. 조기축구 팀 운영을 한 화면에.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PitchMaster",
  },
  openGraph: {
    title: "PitchMaster — 조기축구 팀 관리 플랫폼",
    description: "경기 일정, 참석 투표, 전술판, 회비 관리, MVP 기록까지. 조기축구 팀 운영을 한 화면에.",
    url: "https://pitch-master-eight.vercel.app",
    siteName: "PitchMaster",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PitchMaster — 조기축구 팀 관리 플랫폼",
    description: "경기 일정, 참석 투표, 전술판, 회비 관리, MVP 기록까지.",
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
        <link
          rel="stylesheet"
          as="style"
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
