"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Minus } from "lucide-react";

const rows = [
  { feature: "참석 투표", pm: "실시간 자동 집계", kakao: "수동 집계", band: "투표 기능" },
  { feature: "회비 관리", pm: "캡쳐 자동 입력", kakao: "엑셀 / 메모", band: null },
  { feature: "선수 배치", pm: "자동 배치 + 전술판", kakao: null, band: null },
  { feature: "경기 기록", pm: "골/어시/MVP 자동", kakao: null, band: null },
  { feature: "데이터 분석", pm: "레이더 차트 + 랭킹", kakao: null, band: null },
  { feature: "게시판 / 공지", pm: "고정 공지 + 투표", kakao: "공지 묻힘", band: "게시판" },
  { feature: "푸시 알림", pm: "투표 마감 자동 알림", kakao: null, band: "앱 알림" },
  { feature: "데모 체험", pm: "가입 없이 둘러보기", kakao: null, band: null },
  { feature: "멀티팀", pm: "한 계정 전환", kakao: "방 여러 개", band: "밴드 여러 개" },
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
          <p className="mt-2 text-muted-foreground">카카오톡, 밴드로는 할 수 없는 것들</p>
        </div>

        <div className={`overflow-x-auto rounded-2xl border border-border bg-card ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
          <table className="w-full min-w-[550px] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="p-4 text-left font-medium text-muted-foreground sm:p-5">기능</th>
                <th className="p-4 text-center sm:p-5"><span className="text-lg font-bold text-primary">PitchMaster</span></th>
                <th className="p-4 text-center text-muted-foreground sm:p-5">카톡</th>
                <th className="p-4 text-center text-muted-foreground sm:p-5">밴드</th>
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
                    {r.kakao ?? <Minus className="mx-auto h-4 w-4 text-muted-foreground/30" />}
                  </td>
                  <td className="p-4 text-center text-muted-foreground/60 sm:p-5">
                    {r.band ?? <Minus className="mx-auto h-4 w-4 text-muted-foreground/30" />}
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
