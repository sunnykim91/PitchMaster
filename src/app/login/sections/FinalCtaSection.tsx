import type { ReactNode } from "react";

export default function FinalCtaSection({
  kakaoButton,
  demoButton,
}: {
  kakaoButton: ReactNode;
  demoButton: ReactNode;
}) {
  return (
    <section className="relative border-t border-border/30 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-10 backdrop-blur-sm sm:p-16 md:p-20">
          <div className="absolute inset-0 grid-pattern opacity-15" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-primary/10 blur-3xl" />

          <div className="relative text-center">
            <h2 className="mx-auto max-w-3xl font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
              이번 주부터 카톡 대신
              <br />
              <span className="text-primary">PitchMaster로 운영해보세요</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground sm:text-lg">
              현재 무료. 팀원 초대도 링크 하나면 끝.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
              {kakaoButton}
              {demoButton}
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              무료 · 광고 없음 · 카카오 계정으로 바로 시작
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
