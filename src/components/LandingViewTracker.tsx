"use client";

import { useEffect, useRef } from "react";
import { GA } from "@/lib/analytics";

/**
 * 랜딩 페이지 진입 시 GA `landing_view` 이벤트 1회 발화.
 * 광고 ROI 측정용 — 광고 클릭으로 진입한 사용자 카운트.
 *
 * page.tsx가 server component라서 직접 GA를 호출할 수 없으므로 이 client wrapper로 처리.
 */
export function LandingViewTracker() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    GA.landingView();
  }, []);

  return null;
}
