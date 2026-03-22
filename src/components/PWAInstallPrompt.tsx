"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 이미 PWA로 실행 중이면 표시 안 함
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // 이전에 닫았으면 7일간 숨김
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // iOS 감지
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // iOS는 beforeinstallprompt 이벤트가 없으므로 바로 배너 표시
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Android/Desktop: beforeinstallprompt 이벤트 캡처
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      // iOS는 안내만 가능
      alert("하단 공유 버튼(□↑)을 누른 후 \"홈 화면에 추가\"를 선택해주세요.");
      return;
    }

    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">앱처럼 사용하기</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isIOS
                ? "홈 화면에 추가하면 앱처럼 사용하고 알림도 받을 수 있어요"
                : "설치하면 앱처럼 바로 접속하고 푸시 알림도 받을 수 있어요"}
            </p>
          </div>
          <button onClick={handleDismiss} className="shrink-0 p-1 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={handleInstall}
          className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
        >
          {isIOS ? "설치 방법 보기" : "홈 화면에 추가"}
        </button>
      </div>
    </div>
  );
}
