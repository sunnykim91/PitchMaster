"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";

export default function DemoButton({ compact }: { compact?: boolean } = {}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDemo() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        router.push("/dashboard");
      } else {
        setError("데모 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } catch {
      setError("데모 로그인에 실패했습니다.");
    }
    setLoading(false);
  }

  return (
    <div>
      <button
        onClick={handleDemo}
        disabled={loading}
        className={
          compact
            ? "flex h-12 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary transition-all hover:bg-primary/15 active:scale-[0.98] disabled:opacity-50"
            : "flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-6 py-3 text-sm font-bold text-primary transition-all hover:bg-primary/15 active:scale-[0.98] disabled:opacity-50"
        }
      >
        <Eye className="h-4 w-4" />
        {loading ? "접속 중..." : compact ? "데모 체험" : "30초 만에 데모 체험하기"}
      </button>
      {error && (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
