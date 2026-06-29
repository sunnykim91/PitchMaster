"use client";

import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, Shield } from "lucide-react";
import { AdminUsageCard } from "./AdminUsageCard";
import { AdminOverviewTab } from "./AdminOverviewTab";
import { AdminTeamsTab } from "./AdminTeamsTab";
import { AdminAcquisitionTab } from "./AdminAcquisitionTab";
import { emptyData, type AdminStats } from "./admin.types";

// ── Tabs ───────────────────────────────────────────────

type AdminTab = "overview" | "teams" | "acquisition" | "ai";

const TAB_ITEMS: { key: AdminTab; label: string }[] = [
  { key: "overview", label: "개요" },
  { key: "teams", label: "팀" },
  { key: "acquisition", label: "유입·가입" },
  { key: "ai", label: "AI" },
];

// ── Skeleton ───────────────────────────────────────────

function AdminSkeleton() {
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-7 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Additional summary row */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Table */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-28" />
        </CardHeader>
        <CardContent>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────

export default function AdminClient() {
  const { data, loading, error, refetch } = useApi<AdminStats>(
    "/api/admin/stats",
    emptyData
  );
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-destructive">오류: {error}</span>
          <Button variant="outline" size="sm" onClick={refetch}>
            다시 시도
          </Button>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-lg sm:text-2xl font-bold uppercase flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            관리자 대시보드
          </h1>
        </div>
        <AdminSkeleton />
      </div>
    );
  }

  const { overview, teams, pendingRequests, recentSignups, signupSourceCohorts } = data;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg sm:text-2xl font-bold uppercase flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          관리자 대시보드
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </Button>
      </div>

      {/* ── Tab Bar ── */}
      <div className="sticky top-0 z-10 -mx-1 px-1 bg-[hsl(var(--background)_/_0.98)] border-b border-border">
        <div role="tablist" aria-label="관리자 탭" className="flex">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Panels ── (비활성 탭은 마운트하지 않음) */}
      {activeTab === "overview" && <AdminOverviewTab overview={overview} />}
      {activeTab === "teams" && <AdminTeamsTab teams={teams} />}
      {activeTab === "acquisition" && (
        <AdminAcquisitionTab
          recentSignups={recentSignups}
          signupSourceCohorts={signupSourceCohorts}
          pendingRequests={pendingRequests}
        />
      )}
      {activeTab === "ai" && <AdminUsageCard />}
    </div>
  );
}
