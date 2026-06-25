"use client";

/**
 * /login 세그먼트 에러 경계.
 *
 * 카카오 OAuth callback 또는 랜딩 SSR 실패 시 이 컴포넌트로 fallback.
 * 광고/검색 유입의 첫 진입점이라 global-error 까지 올라가는 white screen 방지.
 */

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[login error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border/30 bg-[hsl(var(--card)_/_0.6)] p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-[hsl(var(--warning))]" />
        <h2 className="mt-3 text-base font-bold">로그인 페이지를 불러오지 못했어요</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          잠시 후 다시 시도해주세요. 카카오 로그인 도중 문제가 생겼다면 카카오톡을 잠시 닫았다 열어주세요.
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
