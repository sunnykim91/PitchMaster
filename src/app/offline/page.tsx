"use client";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
          PitchMaster
        </p>
        <h1 className="font-heading text-3xl font-bold">
          오프라인 상태입니다
        </h1>
        <p className="text-muted-foreground">
          인터넷 연결을 확인한 후 다시 시도해주세요.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-primary px-6 py-2 text-sm font-bold text-primary-foreground"
        >
          새로고침
        </button>
      </div>
    </main>
  );
}
