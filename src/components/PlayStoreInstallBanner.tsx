"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=app.pitchmaster";

const DISMISS_KEY = "playstore-install-banner-shown-v1";
const SHOW_DELAY_MS = 1000;

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * TWA(Trusted Web Activity = Play Store 앱)에서 진입했는지 감지.
 *
 * Bubblewrap이 만든 TWA는 진입 시 document.referrer 가
 * `android-app://app.pitchmaster/...` 로 시작함. OAuth 리다이렉트로
 * referrer가 손실된 후에도 TwaReferrerCapture(root layout)가 저장해 둔
 * sessionStorage 값으로 같은 TWA 세션임을 기억.
 *
 * 이미 앱으로 쓰고 있는 사용자에게 설치 안내를 또 띄우지 않기 위한 가드.
 */
function isTwa(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem("pm_twa") === "1") return true;
  } catch {
    // sessionStorage 차단 환경
  }
  if (/^android-app:\/\/app\.pitchmaster/i.test(document.referrer ?? "")) {
    try { window.sessionStorage.setItem("pm_twa", "1"); } catch {}
    return true;
  }
  return false;
}

function isAlreadyShown(): boolean {
  try {
    return !!localStorage.getItem(DISMISS_KEY);
  } catch {
    return false;
  }
}

function markShown() {
  try {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  } catch {
    // ignore
  }
}

function isForceShow(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("playstore") === "1";
}

/**
 * Google Play 정식 출시 안내 모달 — 안드로이드 브라우저(웹·PWA) 사용자에게
 * 1회 노출해 스토어 설치로 전환 유도.
 *
 * 노출 조건: 안드로이드 && TWA(이미 앱) 아님 && 아직 안 본 사용자.
 * 강제 표시: `?playstore=1` (PC·QA 테스트용).
 */
export default function PlayStoreInstallBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const force = isForceShow();
    if (!force) {
      if (!isAndroid()) return;
      if (isTwa()) return;
      if (isAlreadyShown()) return;
    }
    const t = setTimeout(() => {
      setOpen(true);
      if (!force) markShown();
    }, SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-3 pt-2"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-card p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground leading-tight">
            피치마스터 앱이 나왔어요! 🎉
          </h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Google Play 스토어에 정식 출시됐어요. 앱으로 설치하면{" "}
          <span className="font-semibold text-foreground">홈 화면에서 한 번에 실행</span>할 수
          있어요. 카카오 로그인 그대로라 데이터도 모두 유지됩니다.
        </p>

        {/* CTA — 공식 Google Play 배지 */}
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex justify-center"
          aria-label="Google Play에서 다운로드"
        >
          <Image
            src="/google-play-badge.png"
            alt="Google Play에서 다운로드"
            width={646}
            height={250}
            className="h-14 w-auto"
          />
        </a>

        {/* Footnote */}
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          지금처럼 웹으로 쓰셔도 전혀 문제없어요
        </p>
      </div>
    </div>
  );
}
