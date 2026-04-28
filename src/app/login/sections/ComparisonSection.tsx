"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Minus } from "lucide-react";

const rows = [
  { feature: "참석 투표", pm: "링크 1개 → 다음 6경기 한 번에 응답 + 마감 자동 알림", other: "경기마다 새 투표 / 갠톡 추적" },
  { feature: "AI 라인업·전술 편성", pm: "팀 기록·상대팀 이력·참석자 분석해 포메이션 추천", other: null },
  { feature: "AI 감독 코칭", pm: "편성 근거·고비 쿼터·공격 루트 자동 브리핑", other: null },
  { feature: "공정 쿼터 로테이션", pm: "벤치 편중 자동 분배, 출전 시간 균형", other: null },
  { feature: "회비 OCR + 휴면 면제", pm: "은행 앱 캡처 자동 매칭 + 휴면·부상 회원 자동 면제", other: "엑셀 / 메모 수기" },
  { feature: "자동 경기 후기", pm: "경기 종료 즉시 한 문장 후기 자동 생성", other: null },
  { feature: "선수 카드 & 시즌 어워드", pm: "FIFA 스타일 카드 + 7종 자동 시상", other: null },
  { feature: "PC·모바일", pm: "브라우저로 어디서나, 설치 없이", other: "앱 전용" },
];

export default function ComparisonSection() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setIsVisible(true); }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative border-t border-border/30 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">Comparison</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            왜 PitchMaster인가요?
          </h2>
          <p className="mt-2 text-muted-foreground">조기축구 5년차 회장이 직접 만든, 운영에 진짜 필요한 기능들</p>
        </div>

        <div className={`overflow-x-auto rounded-2xl border border-border bg-card ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="p-4 text-left font-medium text-muted-foreground sm:p-5">기능</th>
                <th className="p-4 text-center sm:p-5"><span className="text-lg font-bold text-primary">PitchMaster</span></th>
                <th className="p-4 text-center text-muted-foreground sm:p-5">타 앱</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.feature}
                  className={`border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/30 ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <td className="p-4 font-medium sm:p-5">{r.feature}</td>
                  <td className="p-4 sm:p-5">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--success))]/20">
                        <Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" strokeWidth={3} />
                      </div>
                      <span className="hidden text-sm font-medium text-[hsl(var(--success))] md:inline">{r.pm}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center text-muted-foreground/60 sm:p-5">
                    {r.other ?? <Minus className="mx-auto h-4 w-4 text-muted-foreground/30" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
