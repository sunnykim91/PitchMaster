"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function DevLoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">로딩 중...</div>}>
      <DevLoginInner />
    </Suspense>
  );
}

function DevLoginInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kakaoId = searchParams.get("kakaoId");

  useEffect(() => {
    // URL에 kakaoId가 있고 NODE_ENV가 production이 아니면 자동 로그인
    if (kakaoId && process.env.NODE_ENV !== "production") {
      handleLogin();
    }
  }, [kakaoId]);

  async function handleLogin() {
    if (!kakaoId) {
      setError("kakaoId가 없습니다");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kakaoId }),
      });

      const data = await res.json();

      if (data.ok) {
        router.push("/dashboard");
      } else {
        setError(data.error || "로그인 실패");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="rounded-lg border border-border bg-card p-8 text-center shadow-lg max-w-sm w-full">
        <h1 className="mb-2 text-2xl font-bold">🔒 개발자 로그인</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          kakaoId: <code className="rounded bg-muted px-2 py-1">{kakaoId}</code>
        </p>

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading || !kakaoId}
          className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>

        <p className="mt-4 text-xs text-muted-foreground">
          ⚠️ 개발 전용 페이지 (프로덕션에서는 비활성화)
        </p>
      </div>
    </div>
  );
}
