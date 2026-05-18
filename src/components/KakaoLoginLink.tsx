"use client";

import type { CSSProperties, PointerEventHandler, ReactNode } from "react";
import { GA } from "@/lib/analytics";
import { captureSignupSourceIfMissing } from "@/components/SignupSourceTracker";

/**
 * 카카오 로그인 a 태그 client wrapper — 클릭 시:
 *   1) signup_source 동기 캡처 (SignupSourceTracker useEffect 못 돌고 jump한 케이스 백업)
 *   2) GA `login_click` 이벤트 발화
 *
 * source 로 어디서 클릭됐는지 구분 (hero / final_cta / sticky_mobile 등).
 * server component(page.tsx)에서 직접 onClick 못 다는 한계 우회용.
 */
export function KakaoLoginLink({
  href,
  source,
  className,
  style,
  onPointerDown,
  tabIndex,
  children,
}: {
  href: string;
  source: string;
  className?: string;
  style?: CSSProperties;
  onPointerDown?: PointerEventHandler<HTMLAnchorElement>;
  tabIndex?: number;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      style={style}
      onPointerDown={onPointerDown}
      tabIndex={tabIndex}
      onClick={() => {
        // first-touch 누락 백업: useEffect 마운트 전 jump 케이스 보강
        captureSignupSourceIfMissing();
        GA.loginClick(source);
      }}
    >
      {children}
    </a>
  );
}
