"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type PromptMode = "install" | "ios" | "inapp";

function detectMode(): PromptMode {
  const ua = navigator.userAgent;

  // 카카오/라인/인스타 등 인앱 브라우저 감지
  if (/KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line/i.test(ua)) {
    return "inapp";
  }

  // iOS
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }

  return "install";
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [mode, setMode] = useState<PromptMode>("install");
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // 이미 PWA로 실행 중이면 표시 안 함 (standalone 또는 fullscreen)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (window.matchMedia("(display-mode: fullscreen)").matches) return;
    // @ts-expect-error -- navigator.standalone은 iOS Safari 전용
    if (navigator.standalone === true) return;

    // 이미 설치 완료한 경우 표시 안 함
    if (localStorage.getItem("pwa-installed") === "true") return;

    // 이전에 닫았으면 7일간 숨김
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const detected = detectMode();
    setMode(detected);

    if (detected === "inapp" || detected === "ios") {
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
    if (mode === "inapp") {
      // 인앱 브라우저 → 외부 브라우저로 열기
      const currentUrl = window.location.href;

      // Android 인텐트로 외부 브라우저 열기 시도
      if (/Android/i.test(navigator.userAgent)) {
        window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
        // 크롬이 없으면 삼성브라우저 등 기본 브라우저로 열림
        setTimeout(() => {
          window.open(currentUrl, "_system");
        }, 500);
      } else {
        // iOS 카카오 인앱 등
        window.open(currentUrl, "_blank");
      }
      return;
    }

    if (mode === "ios") {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem("pwa-installed", "true");
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
  };

  if (!showBanner) return null;

  const content = {
    install: {
      desc: "설치하면 앱처럼 바로 접속하고 푸시 알림도 받을 수 있어요",
      btn: "홈 화면에 추가",
      icon: <Download className="h-5 w-5 text-primary" />,
    },
    ios: {
      desc: "홈 화면에 추가하면 앱처럼 사용하고 알림도 받을 수 있어요",
      btn: "설치 방법 보기",
      icon: <Download className="h-5 w-5 text-primary" />,
    },
    inapp: {
      desc: "외부 브라우저에서 열면 앱 설치와 푸시 알림을 사용할 수 있어요",
      btn: "브라우저에서 열기",
      icon: <ExternalLink className="h-5 w-5 text-primary" />,
    },
  }[mode];

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            {content.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">앱처럼 사용하기</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{content.desc}</p>
          </div>
          <button onClick={handleDismiss} aria-label="닫기" className="shrink-0 p-1 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={handleInstall}
          className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
        >
          {content.btn}
        </button>
      </div>
      {showIosGuide && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowIosGuide(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold">홈 화면에 추가하기</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                <p className="text-sm text-muted-foreground">하단의 <span className="font-semibold text-foreground">공유 버튼(□↑)</span>을 탭하세요</p>
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
