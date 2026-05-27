"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/lib/ConfirmContext";
import { useToast } from "@/lib/ToastContext";
import HintCard from "@/components/HintCard";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

type RosterPlayer = {
  id: string;
  memberId: string;
  name: string;
  isLinked: boolean;
};

export interface MatchAttendanceTabProps {
  attendingMembers: RosterPlayer[];
  attendance: Record<string, AttendanceStatus>;
  canManageAttendance: boolean;
  handleAttendance: (player: { id: string; memberId?: string; isLinked?: boolean }, status: AttendanceStatus) => Promise<void>;
}

function MatchAttendanceTabInner({
  attendingMembers,
  attendance,
  canManageAttendance,
  handleAttendance,
}: MatchAttendanceTabProps) {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [loadingAllPresent, setLoadingAllPresent] = useState(false);
  // unmount 후 setState 경고 방어 (사용자가 confirm 띄운 사이 다른 탭 이동 가능)
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  if (!canManageAttendance) {
    return (
      <section className="space-y-4 py-4">
        <Card className="rounded-xl border-border/30">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">출석 현황</p>
            {attendingMembers.length > 0 && (() => {
              const present = attendingMembers.filter((m) => attendance[m.id] === "PRESENT").length;
              const late = attendingMembers.filter((m) => attendance[m.id] === "LATE").length;
              const absent = attendingMembers.filter((m) => attendance[m.id] === "ABSENT").length;
              return (
                <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                  <span>참석 <strong className="text-[hsl(var(--success))]">{present}</strong></span>
                  <span>지각 <strong className="text-[hsl(var(--warning))]">{late}</strong></span>
                  <span>불참 <strong className="text-destructive">{absent}</strong></span>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-4 py-4">
      <HintCard
        storageKey="hint:attendance:v1"
        title="출석 체크하는 곳이에요"
        description="회원 옆 [참석]·[지각]·[불참] 버튼을 한 번 누르면 끝. 시즌 통산 출석률과 벌금이 자동으로 처리돼요. 운영진만 표시 가능합니다."
      />
      <Card className="rounded-xl border-border/30">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <h3 className="text-base font-bold">출석 체크</h3>
          {attendingMembers.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-sm font-medium text-primary"
              disabled={loadingAllPresent}
              onClick={async () => {
                const ok = await confirm({
                  title: "전원 참석 처리",
                  description: `참석 투표한 ${attendingMembers.length}명 전원을 출석으로 처리합니다.`,
                  confirmLabel: "전원 참석 처리",
                  cancelLabel: "취소",
                });
                if (ok) {
                  if (!mountedRef.current) return;
                  setLoadingAllPresent(true);
                  try {
                    await Promise.all(
                      attendingMembers.map((player) => handleAttendance(player, "PRESENT"))
                    );
                    if (mountedRef.current) showToast("전원 참석 처리가 완료되었습니다.");
                  } catch {
                    if (mountedRef.current) showToast("일부 처리에 실패했습니다.", "error");
                  } finally {
                    if (mountedRef.current) setLoadingAllPresent(false);
                  }
                }
              }}
            >
              {loadingAllPresent ? "처리 중..." : "전원 참석 처리"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {attendingMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">참석 투표한 멤버가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {attendingMembers.map((player) => {
                const status = attendance[player.id];
                return (
                  <Card key={player.id} className="border-0 bg-secondary shadow-none">
                    <CardContent className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {status && (
                          <div className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                            status === "PRESENT" && "bg-[hsl(var(--success))]/20",
                            status === "LATE" && "bg-[hsl(var(--warning))]/20",
                            status === "ABSENT" && "bg-destructive/20",
                          )}>
                            <Check className={cn(
                              "h-3 w-3",
                              status === "PRESENT" && "text-[hsl(var(--success))]",
                              status === "LATE" && "text-[hsl(var(--warning))]",
                              status === "ABSENT" && "text-destructive",
                            )} />
                          </div>
                        )}
                        <span className="text-sm font-semibold truncate">{player.name}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button type="button" variant={status === "PRESENT" ? "default" : "outline"} size="sm" onClick={() => handleAttendance(player, "PRESENT")}>참석</Button>
                        <Button type="button" variant={status === "LATE" ? "warning" : "outline"} size="sm" onClick={() => handleAttendance(player, "LATE")}>지각</Button>
                        <Button type="button" variant={status === "ABSENT" ? "destructive" : "outline"} size="sm" onClick={() => handleAttendance(player, "ABSENT")}>불참</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {/* 출석 현황 요약 */}
          {attendingMembers.length > 0 && (() => {
            const present = attendingMembers.filter((m) => attendance[m.id] === "PRESENT").length;
            const late = attendingMembers.filter((m) => attendance[m.id] === "LATE").length;
            const absent = attendingMembers.filter((m) => attendance[m.id] === "ABSENT").length;
            const unchecked = attendingMembers.length - present - late - absent;
            return (
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground border-t border-border/30 pt-3">
                <span>참석 <strong className="text-[hsl(var(--success))]">{present}</strong></span>
                <span>지각 <strong className="text-[hsl(var(--warning))]">{late}</strong></span>
                <span>불참 <strong className="text-destructive">{absent}</strong></span>
                {unchecked > 0 && <span>미체크 <strong>{unchecked}</strong></span>}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </section>
  );
}

export const MatchAttendanceTab = memo(MatchAttendanceTabInner);
