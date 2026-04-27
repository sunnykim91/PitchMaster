"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const GA_ID = "G-XWRB861513";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * App Router용 GA4 page_view 트래커.
 *
 * gtag.js의 자동 page_view는 첫 SSR 로드만 잡고 클라이언트 라우팅은 못 잡는다.
 * 그 결과 GA "세션 소스/매체"에 `match_detail/(not set)` 같은 행이 잔뜩 쌓인다.
 *
 * 이 컴포넌트는 usePathname 변화를 구독해 page_view를 직접 발화한다.
 * layout.tsx의 gtag config는 send_page_view:false 로 두고 첫 로드 포함 모든 발화를
 * 이 트래커가 단독 책임진다 — 이중 발화 방지.
 */
export function GAPageTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (typeof window === "undefined" || !window.gtag) return;
    window.gtag("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
      send_to: GA_ID,
    });
  }, [pathname]);

  return null;
}
