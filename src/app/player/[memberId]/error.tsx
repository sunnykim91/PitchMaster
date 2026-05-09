"use client";

/**
 * /player/[memberId] 세그먼트 에러 경계.
 *
 * 공개 선수 카드 페이지 — SNS·카톡 공유 링크 진입점이라 white screen 시 신뢰도 타격.
 * fetch 실패·DB 일시 오류 시 다시 시도/홈 버튼 fallback.
 */

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlayerProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[player profile error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border/30 bg-card/60 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-[hsl(var(--warning))]" />
        <h2 className="mt-3 text-base font-bold">선수 카드를 불러오지 못했어요</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          일시적인 오류일 수 있어요. 잠시 후 다시 시도해주세요.
        </p>
        {error.digest && (
          <p className="mt-3 text-[12.5px] text-muted-foreground/60">
            오류 ID: {error.digest}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            다시 시도
          </Button>
          <Button asChild variant="outline">
            <Link href="/">홈으로</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
