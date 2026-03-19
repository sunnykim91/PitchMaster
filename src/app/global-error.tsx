"use client";

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen items-center justify-center bg-[#0a0c10] text-white">
        <div className="text-center">
          <h2 className="text-xl font-bold">오류가 발생했습니다</h2>
          <p className="mt-2 text-sm text-gray-400">
            문제가 지속되면 관리자에게 문의해주세요.
          </p>
          <button
            onClick={reset}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold hover:bg-primary/90"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
