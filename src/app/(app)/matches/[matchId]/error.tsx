"use client";

/**
 * 경기 상세 에러 경계 — 한 경기 렌더·페치 실패를 격리.
 *
 * 상위 (app)/error.tsx 까지 올라가기 전에 이 컴포넌트가 먼저 잡아
 * 경기 목록으로 돌아가는 경로를 제공한다. 탭 다수·데이터 복잡도 높아
 * 전용 경계 유지 가치가 있음.
 */

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MatchDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[match-detail error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border/30 bg-card/60 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-[hsl(var(--warning))]" />
        <h2 className="mt-3 text-base font-bold">경기 정보를 불러오지 못했어요</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          경기가 삭제됐거나 일시적인 오류일 수 있어요.
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
            <Link href="/matches">
              <ChevronLeft className="h-4 w-4" />
              경기 목록으로
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
