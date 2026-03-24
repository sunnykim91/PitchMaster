"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MessageSquare, Bell, BookOpen, Settings, Download, ExternalLink, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const menuItems = [
  { href: "/members", label: "회원 관리", desc: "멤버 목록 · 역할 관리", icon: Users, color: "text-[hsl(var(--success))]" },
  { href: "/board", label: "게시판", desc: "공지 · 자유 게시판", icon: MessageSquare, color: "text-primary" },
  { href: "/notifications", label: "알림", desc: "알림 센터", icon: Bell, color: "text-[hsl(var(--warning))]" },
  { href: "/rules", label: "회칙", desc: "팀 규정 관리", icon: BookOpen, color: "text-[hsl(var(--accent))]" },
  { href: "/settings", label: "설정", desc: "프로필 · 팀 설정", icon: Settings, color: "text-muted-foreground" },
];

export default function MoreClient() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isInApp, setIsInApp] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line/i.test(ua)) {
      setIsInApp(true);
    } else if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      setIsIos(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (isInApp) {
      const url = window.location.href;
      if (/Android/i.test(navigator.userAgent)) {
        window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
      } else {
        window.open(url, "_blank");
      }
      return;
    }
    if (isIos) {
      setShowIosGuide(true);
      return;
    }
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem("pwa-installed", "true");
    }
    setInstallPrompt(null);
  }

  return (
    <div className="grid gap-5 stagger-children">
      <Card>
        <CardContent className="p-6">
          <h2 className="font-heading text-lg sm:text-2xl font-bold uppercase">더보기</h2>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="transition-colors hover:bg-secondary/50">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-secondary ${item.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {/* 홈 화면에 추가 — 항상 표시 */}
        <button onClick={handleInstall}>
          <Card className="transition-colors hover:bg-secondary/50 border-primary/20">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {isInApp ? <ExternalLink className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">
                  {isInApp ? "브라우저에서 열기" : "홈 화면에 추가"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isInApp ? "외부 브라우저에서 열면 앱 설치가 가능해요" : "앱처럼 바로 접속하고 푸시 알림도 받을 수 있어요"}
                </p>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* iOS 설치 가이드 모달 */}
      {showIosGuide && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowIosGuide(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold">홈 화면에 추가하기</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                <p className="text-sm text-muted-foreground">Safari 하단 메뉴바에서 <span className="font-semibold text-foreground">공유 아이콘 ⬆︎</span> (네모에서 화살표 나온 모양)을 탭하세요</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                <p className="text-sm text-muted-foreground">메뉴에서 <span className="font-semibold text-foreground">&quot;홈 화면에 추가&quot;</span>를 선택하세요</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
                <p className="text-sm text-muted-foreground">우측 상단의 <span className="font-semibold text-foreground">&quot;추가&quot;</span>를 탭하세요</p>
              </div>
            </div>
            <button
              onClick={() => setShowIosGuide(false)}
              className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
