"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, X } from "lucide-react";
import { getInstallPrompt, triggerInstall, detectInstallMode, onPromptChange, type InstallMode } from "@/lib/pwaInstall";

export default function PWAInstallPrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const [mode, setMode] = useState<InstallMode>("none");
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // 이미 닫았으면 7일간 숨김
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const detected = detectInstallMode();
    if (detected === "none") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(detected);

    if (detected === "inapp" || detected === "ios") {
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Android/Desktop: 프롬프트가 준비되면 배너 표시
    if (getInstallPrompt()) {
      setTimeout(() => setShowBanner(true), 3000);
    } else {
      const unsub = onPromptChange(() => {
        if (getInstallPrompt()) {
          setTimeout(() => setShowBanner(true), 3000);
          unsub();
        }
      });
      return unsub;
    }
  }, []);

  const handleInstall = async () => {
    if (mode === "inapp") {
      const currentUrl = window.location.href;
      if (/Android/i.test(navigator.userAgent)) {
        window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
        setTimeout(() => { window.open(currentUrl, "_system"); }, 500);
      } else {
        window.open(currentUrl, "_blank");
      }
      return;
    }

    if (mode === "ios") {
      setShowIosGuide(true);
      return;
    }

    const accepted = await triggerInstall();
    if (accepted) setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
  };

  if (!showBanner) return null;

  const content = {
    prompt: {
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
    none: { desc: "", btn: "", icon: null },
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
