"use client";

import type { ReactNode } from "react";
import { GA } from "@/lib/analytics";

/**
 * 카카오 로그인 a 태그 client wrapper — 클릭 시 GA `login_click` 이벤트 발화.
 * source 로 어디서 클릭됐는지 구분 (hero / final_cta / sticky_mobile 등).
 *
 * server component(page.tsx)에서 직접 onClick 못 다는 한계 우회용.
 */
export function KakaoLoginLink({
  href,
  source,
  className,
  children,
}: {
  href: string;
  source: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => GA.loginClick(source)}
    >
      {children}
    </a>
  );
}
