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
      <body style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#0f1117", color: "#f0f0f0", fontFamily: "sans-serif", margin: 0 }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>오류가 발생했습니다</h2>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#9ca3af" }}>
            문제가 지속되면 관리자에게 문의해주세요.
          </p>
          <button
            onClick={reset}
            style={{ marginTop: "1rem", borderRadius: "0.5rem", background: "#e8613a", padding: "0.5rem 1rem", fontSize: "0.875rem", fontWeight: "600", color: "#fff", border: "none", cursor: "pointer" }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
