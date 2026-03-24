/**
 * PWA 설치 프롬프트 전역 공유 모듈
 * beforeinstallprompt 이벤트는 한 번만 발생하므로 전역으로 저장하고 여러 컴포넌트에서 사용
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

/** 현재 저장된 설치 프롬프트 반환 */
export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

/** 설치 프롬프트 실행 */
export async function triggerInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") {
    localStorage.setItem("pwa-installed", "true");
    deferredPrompt = null;
    notifyListeners();
    return true;
  }
  deferredPrompt = null;
  notifyListeners();
  return false;
}

/** 프롬프트 사용 가능 여부가 변경될 때 알림 */
export function onPromptChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

/** OS/브라우저 감지 */
export type InstallMode = "prompt" | "ios" | "inapp" | "none";

export function detectInstallMode(): InstallMode {
  if (typeof window === "undefined") return "none";

  // 이미 PWA로 실행 중
  if (window.matchMedia("(display-mode: standalone)").matches) return "none";
  if (window.matchMedia("(display-mode: fullscreen)").matches) return "none";
  // @ts-expect-error -- navigator.standalone은 iOS Safari 전용
  if (navigator.standalone === true) return "none";

  const ua = navigator.userAgent;

  // 인앱 브라우저
  if (/KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line/i.test(ua)) return "inapp";

  // iOS
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";

  return "prompt";
}

/** 앱 시작 시 한 번 호출 — beforeinstallprompt 이벤트 캡처 */
export function initInstallPromptCapture() {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });
}
