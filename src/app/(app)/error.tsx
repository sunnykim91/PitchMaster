"use client";

/**
 * (app) 세그먼트 에러 경계 — 인증 후 영역 전체 공통 fallback.
 *
 * dashboard/matches/records/dues/members/board/settings 등 하위 라우트에서
 * 렌더·데이터 페치 실패 시 이 컴포넌트가 그려진다. 전체 앱(global-error)까지
 * 올라가기 전에 잡아 헤더·네비는 유지된 채 본문만 에러 UI로 치환.
 */

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Vercel 로그에 스택 남기기 — 추후 Sentry 도입 시 캡쳐 훅 포인트
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border/30 bg-card/60 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-[hsl(var(--warning))]" />
        <h2 className="mt-3 text-base font-bold">문제가 발생했어요</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          일시적인 오류일 수 있어요. 다시 시도하거나 잠시 후에 다시 와주세요.
        </p>
        {error.digest && (
          <p className="mt-3 text-[11px] text-muted-foreground/60">
            오류 ID: {error.digest}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            다시 시도
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              홈으로
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
