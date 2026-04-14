"use client";

import { memo, useMemo, useState } from "react";
import { Plus, Trash2, Check, ChevronUp, Calendar } from "lucide-react";
import { useApi, apiMutate } from "@/lib/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";
import { toKoreanError } from "@/lib/errorMessages";

type Season = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

function mapSeasonRaw(raw: Record<string, unknown>): Season {
  return {
    id: String(raw.id),
    name: String(raw.name),
    startDate: String(raw.start_date),
    endDate: String(raw.end_date),
    isActive: Boolean(raw.is_active),
  };
}

function SeasonManagementComponent() {
  const {
    data: seasonsPayload,
    loading,
    refetch,
  } = useApi<{ seasons: Record<string, unknown>[] }>("/api/seasons", { seasons: [] });

  const seasons: Season[] = useMemo(
    () => seasonsPayload.seasons.map(mapSeasonRaw),
    [seasonsPayload]
  );

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [creating, setCreating] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [seasonMsg, setSeasonMsg] = useState<string | null>(null);

  function autoGenerateName(start: string, end: string): string {
    if (!start || !end) return "";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const year = startDate.getFullYear();
    const startMonth = startDate.getMonth(); // 0-indexed
    const endMonth = endDate.getMonth();

    // 전체 연도
    if (startMonth === 0 && endMonth === 11 && startDate.getDate() === 1 && endDate.getDate() === 31) {
      return `${year}`;
    }
    // 상반기
    if (startMonth === 0 && endMonth === 5 && startDate.getDate() === 1 && endDate.getDate() === 30) {
      return `${year} 상반기`;
    }
    // 하반기
    if (startMonth === 6 && endMonth === 11 && startDate.getDate() === 1 && endDate.getDate() === 31) {
      return `${year} 하반기`;
    }
    return `${year} 시즌`;
  }

  async function handleCreate() {
    if (!newStart || !newEnd) return;
    const name = newName.trim() || autoGenerateName(newStart, newEnd);
    if (!name) return;

    setCreating(true);
    const { error } = await apiMutate("/api/seasons", "POST", {
      name,
      startDate: newStart,
      endDate: newEnd,
      isActive: seasons.length === 0, // 첫 시즌은 자동으로 활성화
    });
    setCreating(false);

    if (error) {
      setSeasonMsg(toKoreanError(String(error)));
    } else {
      setSeasonMsg("시즌이 생성되었습니다.");
      setNewName("");
      setNewStart("");
      setNewEnd("");
      setShowForm(false);
      await refetch();
    }
    setTimeout(() => setSeasonMsg(null), 2000);
  }

  async function handleActivate(id: string) {
    setActivating(id);
    const { error } = await apiMutate("/api/seasons", "PUT", { id });
    setActivating(null);

    if (error) {
      setSeasonMsg(toKoreanError(String(error)));
    } else {
      setSeasonMsg("시즌이 활성화되었습니다.");
      await refetch();
    }
    setTimeout(() => setSeasonMsg(null), 2000);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const { error } = await apiMutate(`/api/seasons?id=${id}`, "DELETE");
    setDeleting(null);

    if (error) {
      setSeasonMsg(toKoreanError(String(error)));
    } else {
      setSeasonMsg("시즌이 삭제되었습니다.");
      await refetch();
    }
    setTimeout(() => setSeasonMsg(null), 2000);
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="font-heading text-lg sm:text-2xl font-bold uppercase text-foreground">
            시즌 관리
          </CardTitle>
        </div>
        <Badge variant="secondary">운영진 전용</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {seasonMsg && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
            {seasonMsg}
          </div>
        )}

        {/* 등록된 시즌 목록 */}
        {seasons.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 시즌이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {seasons.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-xl p-4",
                  s.isActive ? "bg-primary/5 border border-primary/20" : "bg-secondary"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{s.name}</span>
                      {s.isActive && (
                        <Badge variant="success" className="shrink-0">활성</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(s.startDate)} ~ {formatDate(s.endDate)}
                    </p>
                  </div>
                </div>
                {!s.isActive && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activating === s.id}
                      onClick={() => handleActivate(s.id)}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      {activating === s.id ? "..." : "활성화"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deleting === s.id}
                      onClick={() => handleDelete(s.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      {deleting === s.id ? "..." : "삭제"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 새 시즌 추가 버튼 토글 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="w-full"
        >
          {showForm ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              접기
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              새 시즌 추가
            </>
          )}
        </Button>

        {/* 시즌 생성 폼 (접히는 방식) */}
        {showForm && (
          <div className="rounded-xl bg-secondary p-5 space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold">시즌 이름</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="비워두면 자동 생성 (예: 2026, 2026 상반기)"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-semibold">시작일</Label>
                <Input
                  type="date"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">종료일</Label>
                <Input
                  type="date"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </div>
            </div>
            {newStart && newEnd && !newName && (
              <p className="text-xs text-muted-foreground">
                자동 생성 이름: <span className="font-semibold text-foreground">{autoGenerateName(newStart, newEnd)}</span>
              </p>
            )}
            <Button
              size="sm"
              disabled={creating || !newStart || !newEnd}
              onClick={handleCreate}
            >
              {creating ? "생성 중..." : "시즌 생성"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const SeasonManagement = memo(SeasonManagementComponent);
