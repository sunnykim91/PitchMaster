"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import PitchScoreHistory, { type SessionView } from "./PitchScoreHistory";
import type { SportType } from "@/lib/playerAttributes/types";

interface Props {
  targetUserId: string;
  sportType: SportType;
}

interface HistoryResponse {
  sessions: SessionView[];
  sport_type: SportType;
  viewer_is_staff: boolean;
}

export default function EvaluationHistoryView({ targetUserId, sportType }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [viewerIsStaff, setViewerIsStaff] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ sport: sportType });
        const res = await fetch(
          `/api/players/${targetUserId}/evaluations/history?${params.toString()}`,
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "이력 로딩 실패");
        }
        const json: HistoryResponse = await res.json();
        if (cancelled) return;
        setSessions(json.sessions);
        setViewerIsStaff(json.viewer_is_staff);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "오류");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [targetUserId, sportType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        평가 이력 불러오는 중…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        아직 평가 이력이 없어요
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-base font-bold">평가 세션</h2>
        <span className="text-[11px] text-muted-foreground">평가 {sessions.length}회</span>
      </div>
      <PitchScoreHistory sessions={sessions} viewerIsStaff={viewerIsStaff} />
    </section>
  );
}
