"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface Props {
  label?: string;
  fallbackHref?: string;
  className?: string;
}

/**
 * 브라우저 history 뒤로가기 버튼.
 * 진입 경로가 다양해 고정 링크 사용 시 무한 루프 발생하는 페이지에서 사용.
 *
 * - history 가 1 초과면 router.back() 으로 정확히 들어온 곳 복귀
 * - 직접 URL 진입(history 1)이면 fallbackHref 로 이동 (기본 /dashboard)
 */
export default function BackButton({
  label = "뒤로",
  fallbackHref = "/dashboard",
  className,
}: Props) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className={
        className ??
        "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      }
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
