"use client";

import { useApi } from "@/lib/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Bot, FileText, AlertTriangle, DollarSign } from "lucide-react";

type UsageData = {
  last30d: {
    totalCalls: number;
    aiCalls: number;
    ruleCalls: number;
    errorCalls: number;
    byFeature: Record<string, number>;
    byTeam: { teamId: string; teamName: string; count: number }[];
    dailyTrend: { date: string; count: number }[];
    tokens: {
      input: number;
      output: number;
      cacheRead: number;
      cacheCreation: number;
    };
    costEstimateUSD: number;
  };
  allTime: { totalCalls: number };
};

const FEATURE_LABELS: Record<string, string> = {
  signature: "선수 시그니처",
  match_summary: "경기 후기",
  tactics: "AI 전술 코치",
  ocr: "회비 OCR",
  full_plan: "AI 풀 플랜",
};

export function AdminUsageCard() {
  const { data, loading, error } = useApi<{ data: UsageData } | null>(
    "/api/admin/usage",
    null
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            AI 사용량 (최근 30일)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            AI 사용량 (최근 30일)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error ? `로드 실패: ${error}` : "데이터 없음"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const u = data.data.last30d;
  const aiPct = u.totalCalls > 0 ? Math.round((u.aiCalls / u.totalCalls) * 100) : 0;
  const errorPct = u.totalCalls > 0 ? Math.round((u.errorCalls / u.totalCalls) * 100) : 0;
  const maxDaily = Math.max(...u.dailyTrend.map((d) => d.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          AI 사용량 (최근 30일)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 요약 카드 4개 */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <SummaryStat
            icon={<Bot className="h-3.5 w-3.5" />}
            label="총 호출수"
            value={u.totalCalls.toLocaleString()}
            sub={`AI ${u.aiCalls.toLocaleString()} · 룰 ${u.ruleCalls.toLocaleString()}`}
          />
          <SummaryStat
            icon={<FileText className="h-3.5 w-3.5" />}
            label="AI 성공률"
            value={`${aiPct}%`}
            sub={`AI ${u.aiCalls} / 전체 ${u.totalCalls}`}
            tone={aiPct >= 80 ? "success" : aiPct >= 60 ? "warning" : "destructive"}
          />
          <SummaryStat
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label="실패율"
            value={`${errorPct}%`}
            sub={`${u.errorCalls.toLocaleString()}건 실패`}
            tone={errorPct < 5 ? "success" : errorPct < 15 ? "warning" : "destructive"}
          />
          <SummaryStat
            icon={<DollarSign className="h-3.5 w-3.5" />}
            label="비용 (Haiku 추정)"
            value={`$${u.costEstimateUSD.toFixed(2)}`}
            sub={`tokens ${(u.tokens.input + u.tokens.output).toLocaleString()}`}
          />
        </div>

        {/* 일별 추이 (sparkline 막대) */}
        <div>
          <div className="text-xs text-muted-foreground mb-2 font-medium">
            일별 호출 추이 (최근 30일)
          </div>
          <div className="flex items-end gap-0.5 h-16 bg-secondary/30 rounded p-1">
            {u.dailyTrend.map((d) => (
              <div
                key={d.date}
                className="flex-1 bg-primary/70 rounded-t hover:bg-primary transition-colors"
                style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: 2 }}
                title={`${d.date}: ${d.count}회`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{u.dailyTrend[0]?.date.slice(5)}</span>
            <span>{u.dailyTrend[u.dailyTrend.length - 1]?.date.slice(5)}</span>
          </div>
        </div>

        {/* 기능별 + 팀 상위 — 2-column */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* 기능별 */}
          <div>
            <div className="text-xs text-muted-foreground mb-2 font-medium">
              기능별 호출수
            </div>
            <div className="space-y-1.5">
              {Object.entries(u.byFeature)
                .sort((a, b) => b[1] - a[1])
                .map(([feature, count]) => {
                  const pct = (count / Math.max(u.totalCalls, 1)) * 100;
                  return (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <span className="w-24 shrink-0 text-foreground/80">
                        {FEATURE_LABELS[feature] ?? feature}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-secondary/50 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">
                        {count.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              {Object.keys(u.byFeature).length === 0 && (
                <p className="text-xs text-muted-foreground">호출 데이터 없음</p>
              )}
            </div>
          </div>

          {/* 상위 팀 */}
          <div>
            <div className="text-xs text-muted-foreground mb-2 font-medium">
              상위 사용 팀 (Top 10)
            </div>
            <div className="space-y-1.5">
              {u.byTeam.slice(0, 10).map((t) => {
                const max = u.byTeam[0]?.count ?? 1;
                const pct = (t.count / max) * 100;
                return (
                  <div key={t.teamId} className="flex items-center gap-2 text-sm">
                    <span className="w-28 shrink-0 truncate text-foreground/80" title={t.teamName}>
                      {t.teamName}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-secondary/50 overflow-hidden">
                      <div
                        className="h-full bg-info rounded-full"
                        style={{ width: `${pct}%`, background: "hsl(var(--info))" }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
                      {t.count}
                    </span>
                  </div>
                );
              })}
              {u.byTeam.length === 0 && (
                <p className="text-xs text-muted-foreground">팀별 데이터 없음</p>
              )}
            </div>
          </div>
        </div>

        {/* 누적 통계 */}
        <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <span>누적 AI 호출: <b className="text-foreground">{data.data.allTime.totalCalls.toLocaleString()}</b>회</span>
          <span>토큰: in {u.tokens.input.toLocaleString()} / out {u.tokens.output.toLocaleString()} / cache {u.tokens.cacheRead.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryStat({
  icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "success" | "warning" | "destructive";
}) {
  const valueColor =
    tone === "success" ? "text-[hsl(var(--success))]"
    : tone === "warning" ? "text-[hsl(var(--warning))]"
    : tone === "destructive" ? "text-destructive"
    : "text-foreground";

  return (
    <div className="rounded-lg border border-border/40 bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1.5">
        {icon}
        {label}
      </div>
      <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground/80 mt-0.5">{sub}</div>
    </div>
  );
}
