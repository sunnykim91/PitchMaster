"use client";

import { useMemo, useState } from "react";
import { useApi, apiMutate } from "@/lib/useApi";
import type { DetailedPosition, Role } from "@/lib/types";
import { isPresident, isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatPhone } from "@/lib/utils";

type Member = {
  id: string;
  name: string;
  role: Role;
  preferredPositions: DetailedPosition[];
  preferredFoot: "RIGHT" | "LEFT" | "BOTH";
  phone: string;
  birthDate: string;
};

type ApiMemberRow = {
  id: string;
  user_id: string;
  role: Role;
  status: string;
  joined_at: string;
  users: {
    id: string;
    name: string;
    preferred_positions: string[];
    preferred_foot: "RIGHT" | "LEFT" | "BOTH" | null;
    phone: string | null;
    birth_date: string | null;
  };
};

function mapApiMembers(rows: ApiMemberRow[]): Member[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.users.name,
    role: row.role,
    preferredPositions: (row.users.preferred_positions ?? []) as DetailedPosition[],
    preferredFoot: row.users.preferred_foot ?? "RIGHT",
    phone: row.users.phone ?? "",
    birthDate: row.users.birth_date ?? "",
  }));
}

const roleLabels: Record<Role, string> = {
  PRESIDENT: "회장",
  STAFF: "운영진",
  MEMBER: "평회원",
};

export default function MembersClient({
  currentRole,
  currentUserId,
}: {
  currentRole?: Role;
  currentUserId?: string;
}) {
  const { data, loading, error, refetch } = useApi<{ members: ApiMemberRow[] }>(
    "/api/members",
    { members: [] },
  );
  const members = useMemo(() => mapApiMembers(data.members), [data.members]);
  const [confirmKick, setConfirmKick] = useState<string | null>(null);
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(currentRole);

  const canChangeRole = isPresident(role);
  const canKick = isPresident(role);
  const canViewAll = isStaffOrAbove(role);

  const stats = useMemo(() => {
    const counts = { PRESIDENT: 0, STAFF: 0, MEMBER: 0 } as Record<Role, number>;
    members.forEach((member) => {
      counts[member.role] += 1;
    });
    return counts;
  }, [members]);

  async function handleRoleChange(memberId: string, role: Role) {
    if (!canChangeRole) return;
    const { error: err } = await apiMutate("/api/members", "PUT", { memberId, role });
    if (!err) {
      await refetch();
    }
  }

  async function handleKick(memberId: string) {
    if (!canKick) return;
    const { error: err } = await apiMutate(`/api/members?memberId=${memberId}`, "DELETE");
    if (!err) {
      await refetch();
    }
    setConfirmKick(null);
  }

  if (loading) {
    return (
      <Card className="p-6">
        <span>불러오는 중...</span>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <span className="text-destructive">오류: {error}</span>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
      {/* ── Section 1: 회원 관리 ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-teal-400">
                Members
              </p>
              <CardTitle className="mt-1 font-heading text-2xl font-bold uppercase">
                회원 관리
              </CardTitle>
            </div>
            <Badge variant="secondary" className="px-4 py-2 text-xs font-bold">
              현재 권한: {currentRole ? roleLabels[currentRole] : "확인 중"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {([
              { label: "회장", value: stats.PRESIDENT, color: "text-amber-400", bg: "bg-amber-500/10" },
              { label: "운영진", value: stats.STAFF, color: "text-sky-400", bg: "bg-sky-500/10" },
              { label: "평회원", value: stats.MEMBER, color: "text-teal-400", bg: "bg-teal-500/10" },
            ] as const).map((item) => (
              <Card key={item.label} className={cn("border-0 p-4", item.bg)}>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={cn("mt-1 font-heading text-2xl font-bold", item.color)}>
                  {item.value}명
                </p>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: 멤버 목록 ── */}
      <Card>
        <CardHeader>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-teal-400">
            Roster
          </p>
          <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
            멤버 목록
          </CardTitle>
          {!canViewAll && (
            <p className="mt-2 text-xs text-muted-foreground">
              평회원은 이름과 선호 포지션만 조회할 수 있습니다.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((member) => (
              <Card
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-4 bg-secondary border-0 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{member.name}</p>
                  {canViewAll ? (
                    <p className="text-xs text-muted-foreground">
                      {formatPhone(member.phone)} · {member.birthDate}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    선호 포지션: {member.preferredPositions.join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="px-3 py-1">
                    {member.preferredFoot === "RIGHT"
                      ? "오른발"
                      : member.preferredFoot === "LEFT"
                      ? "왼발"
                      : "양발"}
                  </Badge>
                  {canChangeRole ? (
                    <Select value={member.role} onValueChange={(value) => handleRoleChange(member.id, value as Role)}>
                      <SelectTrigger className="w-auto min-w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRESIDENT">회장</SelectItem>
                        <SelectItem value="STAFF">운영진</SelectItem>
                        <SelectItem value="MEMBER">평회원</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="px-3 py-1">
                      {roleLabels[member.role]}
                    </Badge>
                  )}
                  {canKick && member.id !== currentUserId ? (
                    confirmKick === member.id ? (
                      <div className="flex gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleKick(member.id)}
                        >
                          확인
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmKick(null)}
                        >
                          취소
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmKick(member.id)}
                      >
                        탈퇴
                      </Button>
                    )
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
