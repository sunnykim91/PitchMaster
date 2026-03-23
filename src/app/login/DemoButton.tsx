"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";

export default function DemoButton({ compact }: { compact?: boolean } = {}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDemo() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        router.push("/dashboard");
      } else {
        alert("데모 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } catch {
      alert("데모 로그인에 실패했습니다.");
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleDemo}
      disabled={loading}
      className={
        compact
          ? "flex h-12 items-center gap-1.5 rounded-xl border border-border/50 px-4 text-sm font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground active:scale-[0.98] disabled:opacity-50"
          : "flex items-center gap-2 rounded-full border border-border/50 px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground active:scale-[0.98] disabled:opacity-50"
      }
    >
      <Eye className="h-4 w-4" />
      {loading ? "접속 중..." : compact ? "둘러보기" : "회원가입 없이 둘러보기"}
    </button>
  );
}
