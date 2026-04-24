"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Share2, TrendingUp, TrendingDown, Trophy, Users, Calendar } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/ToastContext";
import { cn } from "@/lib/utils";

type Category = { label: string; amount: number; type: "INCOME" | "EXPENSE"; count: number };
type MonthlyReport = {
  month: string;
  finance: {
    income: number;
    expense: number;
    net: number;
    transactionCount: number;
    categories: Category[];
  };
  matches: {
    total: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  attendance: {
    totalParticipants: number;
    avgPerMatch: number;
  };
};

function formatAmount(n: number): string {
  return n.toLocaleString("ko-KR");
}

function currentYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function addMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ymLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${y}년 ${m}월`;
}

export default function MonthlyReportClient({ teamName }: { teamName: string }) {
  const [ym, setYm] = useState<string>(currentYm());
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useToast();

  const empty: MonthlyReport = {
    month: ym,
    finance: { income: 0, expense: 0, net: 0, transactionCount: 0, categories: [] },
    matches: { total: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
    attendance: { totalParticipants: 0, avgPerMatch: 0 },
  };

  const { data, loading, error } = useApi<MonthlyReport>(`/api/reports/monthly?month=${ym}`, empty);

  const isCurrentMonth = ym === currentYm();
  const isFutureMonth = ym > currentYm();

  const hasAnyData = data.finance.transactionCount > 0 || data.matches.total > 0;

  const winRate = useMemo(() => {
    if (data.matches.total === 0) return 0;
    return Math.round((data.matches.wins / data.matches.total) * 100);
  }, [data.matches]);

  async function handleShare() {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#0a0c10",
      });

      // 공유 가능 여부 체크 (Web Share API)
      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `${teamName}_${ym}_결산.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${teamName} ${ymLabel(ym)} 결산`,
          });
          setIsExporting(false);
          return;
        }
      }

      // 폴백: 다운로드
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${teamName}_${ym}_결산.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("이미지가 저장되었습니다. 카카오톡에서 공유해주세요.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`공유 실패: ${msg}`, "error");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">월별 결산</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{teamName}</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dues" className="text-xs text-muted-foreground">
            <ChevronLeft className="h-3.5 w-3.5" />
            회비로
          </Link>
        </Button>
      </div>

      {/* 월 선택기 */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
        <button
          type="button"
          onClick={() => setYm((prev) => addMonth(prev, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="이전 달"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="font-bold text-lg">{ymLabel(ym)}</div>
          {isCurrentMonth && <div className="text-[10px] text-muted-foreground">진행 중</div>}
          {isFutureMonth && <div className="text-[10px] text-[hsl(var(--warning))]">미래 월</div>}
        </div>
        <button
          type="button"
          onClick={() => setYm((prev) => addMonth(prev, 1))}
          disabled={isCurrentMonth || isFutureMonth}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="다음 달"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* 결산 카드 (공유 대상) */}
      <div ref={cardRef} className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary/40 p-5 space-y-5">
        {/* 카드 헤더 — 공유 이미지에 포함될 브랜딩 */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Monthly Report</div>
            <div className="font-heading text-xl font-bold">{teamName}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Period</div>
            <div className="font-heading text-xl font-bold text-primary">{ymLabel(ym)}</div>
          </div>
        </div>

        {loading ? (
          <ReportSkeleton />
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            결산 데이터를 불러오지 못했습니다: {error}
          </div>
        ) : !hasAnyData ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{ymLabel(ym)}에는 아직 기록이 없습니다</p>
          </div>
        ) : (
          <>
            {/* 재무 섹션 */}
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">💰 재무</h2>
              <div className="grid grid-cols-3 gap-2">
                <FinanceStatCard
                  label="수입"
                  value={data.finance.income}
                  tone="success"
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                />
                <FinanceStatCard
                  label="지출"
                  value={data.finance.expense}
                  tone="loss"
                  icon={<TrendingDown className="h-3.5 w-3.5" />}
                />
                <FinanceStatCard
                  label="순이익"
                  value={data.finance.net}
                  tone={data.finance.net >= 0 ? "primary" : "loss"}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground text-right">
                거래 {data.finance.transactionCount}건
              </p>

              {/* 카테고리 리스트 */}
              {data.finance.categories.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {data.finance.categories.slice(0, 6).map((c) => (
                    <div key={`${c.type}:${c.label}`} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            c.type === "INCOME" ? "bg-[hsl(var(--success))]" : "bg-[hsl(var(--loss))]",
                          )}
                        />
                        <span className="text-foreground/80">{c.label}</span>
                        <span className="text-muted-foreground/70">· {c.count}건</span>
                      </span>
                      <span className={cn("font-medium", c.type === "INCOME" ? "text-[hsl(var(--success))]" : "text-[hsl(var(--loss))]")}>
                        {c.type === "INCOME" ? "+" : "-"}{formatAmount(c.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 경기 섹션 — 경기 있을 때만 */}
            {data.matches.total > 0 && (
              <section className="border-t border-border/30 pt-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">⚽ 경기</h2>
                <div className="grid grid-cols-4 gap-2">
                  <MatchStatCard label="경기" value={String(data.matches.total)} />
                  <MatchStatCard
                    label="승"
                    value={String(data.matches.wins)}
                    tone="win"
                  />
                  <MatchStatCard
                    label="무"
                    value={String(data.matches.draws)}
                  />
                  <MatchStatCard
                    label="패"
                    value={String(data.matches.losses)}
                    tone="loss"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>득 {data.matches.goalsFor} · 실 {data.matches.goalsAgainst} · 승률 {winRate}%</span>
                  <span>평균 참석 <strong className="text-foreground">{data.attendance.avgPerMatch}명</strong></span>
                </div>
              </section>
            )}
          </>
        )}

        {/* 카드 푸터 */}
        <div className="border-t border-border/30 pt-3 text-center">
          <div className="text-[10px] tracking-[0.3em] text-muted-foreground/60">PITCHMASTER</div>
          <div className="text-[10px] text-muted-foreground/40 mt-0.5">pitch-master.app</div>
        </div>
      </div>

      {/* 공유 버튼 */}
      {hasAnyData && (
        <Button
          type="button"
          onClick={handleShare}
          disabled={isExporting}
          className="w-full gap-2"
          size="lg"
        >
          {isExporting ? (
            <>저장 중...</>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              카카오톡으로 공유
            </>
          )}
        </Button>
      )}

      {/* 가이드 */}
      <p className="text-center text-[11px] text-muted-foreground">
        공유 시 이미지로 저장되어 카카오톡·인스타그램에 올릴 수 있어요
      </p>
    </div>
  );
}

function FinanceStatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "success" | "loss" | "primary";
  icon?: React.ReactNode;
}) {
  const toneClasses = {
    success: "text-[hsl(var(--success))]",
    loss: "text-[hsl(var(--loss))]",
    primary: "text-primary",
  };
  return (
    <div className="rounded-lg bg-secondary/40 p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-1 font-bold text-lg", toneClasses[tone])}>
        {tone === "loss" || (tone === "primary" && value < 0) ? "" : value > 0 && tone === "primary" ? "+" : ""}
        {formatAmount(value)}
      </div>
    </div>
  );
}

function MatchStatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "win" | "loss";
}) {
  const toneClass = tone === "win"
    ? "text-[hsl(var(--win))]"
    : tone === "loss"
      ? "text-[hsl(var(--loss))]"
      : "text-foreground";
  return (
    <div className="rounded-lg bg-secondary/40 p-3 text-center">
      <div className={cn("font-bold text-lg", toneClass)}>{value}</div>
      <div className="text-[10px] font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-lg" />
    </div>
  );
}
