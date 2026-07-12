"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

/**
 * Service Worker 등록 + 업데이트 감지 + reload prompt.
 *
 * 동기:
 *   TWA 사용자가 앱을 백그라운드로 두고 며칠 안 닫으면 SW 가 갱신되지 않아
 *   stale 캐시·옛 JS 가 그대로 돌고, Vercel 배포한 핫픽스가 반영되지 않는다.
 *
 * 동작:
 *   1. 페이지 진입 시 SW 등록 + 즉시 1회 update 체크
 *   2. 5분 간격 polling + 가시성 변경(visibilitychange)·창 포커스 시 update 체크
 *   3. 새 SW 가 installed 상태이고 기존 controller 가 있으면 = 업데이트 대기 신호
 *      → 하단 배너로 "새 버전 있어요" 표시 + reload 버튼
 *   4. 사용자가 reload 누르면 location.reload() (사용자 입력 보호)
 *   5. dismiss 버튼은 한 세션 동안만 숨김 (다음 진입 시 다시 표시)
 */
export default function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // 개발 환경에선 SW 를 등록하지 않는다. dev 는 청크 해시가 자주 바뀌는데 캐시된 옛 SW 가
    // stale 번들을 서빙하면 하이드레이션 불일치·레이아웃 깨짐이 생긴다(2026-07-12 로컬 사고).
    // 과거 dev 세션·prod 방문 잔재로 이미 등록된 SW·캐시가 있으면 능동 해제해 자가 치유한다.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations?.()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
      }
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;
    let cancelled = false;

    function attachInstallingListener(reg: ServiceWorkerRegistration) {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (cancelled) return;
        // installed 상태 + controller 존재 = 기존 SW 있는 상태에서 새 SW 설치됨 = 업데이트
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          setUpdateAvailable(true);
        }
      });
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (cancelled) return;
        registration = reg;

        // 등록 직후에도 이미 waiting/installing 인 SW 있을 수 있음
        if (reg.waiting && navigator.serviceWorker.controller) {
          setUpdateAvailable(true);
        }
        if (reg.installing) attachInstallingListener(reg);

        reg.addEventListener("updatefound", () => attachInstallingListener(reg));

        // 등록 직후 즉시 1회 update 체크
        reg.update().catch(() => {});
      })
      .catch(() => {});

    // 주기 폴링 (5분) — SW 가 stale 한 상태로 백그라운드 오래 있어도 잡힘
    const interval = setInterval(() => {
      registration?.update().catch(() => {});
    }, 5 * 60 * 1000);

    // 가시성 회복·포커스 시 즉시 체크 — 사용자가 앱 다시 열 때마다 업데이트 확인
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        registration?.update().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  if (!updateAvailable || dismissed) return null;

  return (
    <div
      className="fixed left-3 right-3 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card shadow-2xl"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)_/_0.15)] text-primary">
          <RefreshCw className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">새 버전이 있어요</p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">새로고침하면 최신 화면으로 바뀌어요</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-[hsl(var(--primary)_/_0.9)]"
        >
          새로고침
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="닫기"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
