"use client";

import { useMemo, useState } from "react";
import { useApi, apiMutate } from "@/lib/useApi";
import type { DetailedPosition, Role } from "@/lib/types";
import { isPresident, isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { useToast } from "@/lib/ToastContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatPhone } from "@/lib/utils";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Users } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Member = {
  id: string;
  name: string;
  role: Role;
  preferredPositions: DetailedPosition[];
  preferredFoot: "RIGHT" | "LEFT" | "BOTH";
  phone: string;
  birthDate: string;
  status: string;
  isLinked: boolean; // user_id가 있는지
  preName: string | null;
  prePhone: string | null;
};

type ApiMemberRow = {
  id: string;
  user_id: string | null;
  role: Role;
  status: string;
  joined_at: string;
  pre_name: string | null;
  pre_phone: string | null;
  users: {
    id: string;
    name: string;
    preferred_positions: string[];
    preferred_foot: "RIGHT" | "LEFT" | "BOTH" | null;
    phone: string | null;
    birth_date: string | null;
  } | null;
};

function mapApiMembers(rows: ApiMemberRow[]): Member[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.users?.name ?? row.pre_name ?? "이름 없음",
    role: row.role,
    preferredPositions: (row.users?.preferred_positions ?? []) as DetailedPosition[],
    preferredFoot: row.users?.preferred_foot ?? "RIGHT",
    phone: row.users?.phone ?? row.pre_phone ?? "",
    birthDate: row.users?.birth_date ?? "",
    status: row.status,
    isLinked: row.user_id !== null,
    preName: row.pre_name,
    prePhone: row.pre_phone,
  }));
}

const roleLabels: Record<Role, string> = {
  PRESIDENT: "회장",
  STAFF: "운영진",
  MEMBER: "평회원",
};

export default function MembersClient({
  userRole,
  userId,
  initialData,
}: {
  userRole?: Role;
  userId: string;
  initialData?: { members: ApiMemberRow[]; isStaff: boolean };
}) {
  const { data: membersData, loading, error, refetch } = useApi<{ members: ApiMemberRow[]; isStaff: boolean }>(
    "/api/members",
    initialData ?? { members: [], isStaff: false },
    { skip: !!initialData },
  );
  const members = useMemo(() => mapApiMembers(membersData.members), [membersData.members]);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);
  const { showToast } = useToast();

  const canChangeRole = isPresident(role);
  const canKick = isPresident(role);
  const canViewAll = isStaffOrAbove(role);
  const canPreRegister = isStaffOrAbove(role);

  // 사전 등록 폼
  const [showRegForm, setShowRegForm] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);

  // 수동 연동
  const [linkingMemberId, setLinkingMemberId] = useState<string | null>(null);

  // 버튼 로딩 상태
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const activeMembers = useMemo(() => members.filter((m) => m.status === "ACTIVE"), [members]);
  const dormantMembers = useMemo(() => members.filter((m) => m.status === "DORMANT"), [members]);
  const linkedMembers = useMemo(() => activeMembers.filter((m) => m.isLinked), [activeMembers]);
  const unlinkedMembers = useMemo(() => activeMembers.filter((m) => !m.isLinked), [activeMembers]);

  const filteredLinkedMembers = useMemo(
    () =>
      searchQuery.trim() === ""
        ? linkedMembers
        : linkedMembers.filter(
            (m) =>
              m.name.includes(searchQuery) ||
              m.preName?.includes(searchQuery)
          ),
    [linkedMembers, searchQuery]
  );

  const stats = useMemo(() => {
    const counts = { PRESIDENT: 0, STAFF: 0, MEMBER: 0 } as Record<Role, number>;
    activeMembers.forEach((member) => {
      counts[member.role] += 1;
    });
    return { ...counts, DORMANT: dormantMembers.length };
  }, [activeMembers, dormantMembers]);

  async function handleRoleChange(memberId: string, newRole: Role) {
    if (!canChangeRole) return;
    setChangingRoleId(memberId);
    try {
      const { error: err } = await apiMutate("/api/members", "PUT", { memberId, role: newRole });
      if (!err) {
        showToast("역할이 변경되었습니다.");
        await refetch();
      } else {
        showToast("역할 변경에 실패했습니다.", "error");
      }
    } finally {
      setChangingRoleId(null);
    }
  }

  async function handleKick(memberId: string) {
    if (!canKick) return;
    setKickingId(memberId);
    try {
      const { error: err } = await apiMutate(`/api/members?memberId=${memberId}`, "DELETE");
      if (!err) {
        showToast("멤버가 제거되었습니다.");
        await refetch();
      }
    } finally {
      setKickingId(null);
    }
  }

  async function handlePreRegister() {
    if (!regName.trim()) return;
    setRegSubmitting(true);
    const { error: err } = await apiMutate("/api/members", "POST", {
      action: "pre_register",
      name: regName.trim(),
      phone: regPhone,
    });
    setRegSubmitting(false);
    if (!err) {
      showToast("팀원이 사전 등록되었습니다.");
      setRegName("");
      setRegPhone("");
      setShowRegForm(false);
      await refetch();
    }
  }

  async function handleLink(memberId: string, userId: string) {
    setLinkingId(memberId);
    try {
      const { error: err } = await apiMutate("/api/members", "POST", {
        action: "link",
        memberId,
        userId,
      });
      if (!err) {
        showToast("멤버가 연동되었습니다.");
        setLinkingMemberId(null);
        await refetch();
      }
    } finally {
      setLinkingId(null);
    }
  }

  async function handleStatusChange(memberId: string, newStatus: "ACTIVE" | "DORMANT") {
    const { error: err } = await apiMutate("/api/members", "PUT", {
      action: "update_status",
      memberId,
      status: newStatus,
    });
    if (!err) {
      showToast(newStatus === "DORMANT" ? "휴면 처리되었습니다." : "활동 회원으로 복귀했습니다.");
      await refetch();
    } else {
      showToast("상태 변경에 실패했습니다.", "error");
    }
  }

  if (loading) {
    return (
      <div className="grid gap-5 stagger-children">
        <Card><CardHeader><Skeleton className="h-3 w-20"/><Skeleton className="mt-1 h-7 w-40"/></CardHeader>
          <CardContent><div className="grid gap-3 sm:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="rounded-lg bg-secondary p-4 space-y-2"><Skeleton className="h-3 w-16"/><Skeleton className="h-6 w-12"/></div>)}
          </div></CardContent>
        </Card>
        <Card><CardContent className="p-4 space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg"/>)}
        </CardContent></Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-destructive">오류: {error}</span>
          <Button variant="outline" size="sm" onClick={refetch}>다시 시도</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 stagger-children">
      {/* ── Section 1: 회원 관리 ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="font-heading text-lg sm:text-2xl font-bold uppercase">회원 관리</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-4 py-2 text-xs font-bold">
                현재 권한: {userRole ? roleLabels[userRole] : "확인 중"}
              </Badge>
              {canPreRegister && (
                <Button
                  size="sm"
                  onClick={() => setShowRegForm(!showRegForm)}
                >
                  {showRegForm ? "닫기" : "팀원 미리 등록"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 사전 등록 폼 */}
          {showRegForm && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-bold">팀원 사전 등록</p>
                <p className="text-xs text-muted-foreground">
                  아직 가입하지 않은 팀원을 미리 등록해두세요. 나중에 가입하면 자동으로 연동됩니다.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">이름 (필수)</Label>
                    <Input
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="홍길동"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">전화번호 (선택)</Label>
                    <PhoneInput
                      value={regPhone}
                      onValueChange={setRegPhone}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  전화번호가 있으면 가입 시 자동 연동, 없으면 이름으로 매칭됩니다.
                </p>
                <Button
                  size="sm"
                  onClick={handlePreRegister}
                  disabled={regSubmitting || !regName.trim()}
                >
                  {regSubmitting ? "등록 중..." : "등록"}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {([
              { label: "회장", value: stats.PRESIDENT, color: "text-[hsl(var(--warning))]" },
              { label: "운영진", value: stats.STAFF, color: "text-[hsl(var(--info))]" },
              { label: "평회원", value: stats.MEMBER, color: "text-[hsl(var(--success))]" },
              { label: "휴면", value: stats.DORMANT, color: "text-muted-foreground" },
            ] as const).map((item) => (
              <div key={item.label} className="card-stat">
                <p className="type-overline">{item.label}</p>
                <p className={cn("mt-1 type-stat", item.color)}>
                  {item.value}명
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: 미연동 멤버 ── */}
      {unlinkedMembers.length > 0 && canViewAll && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg sm:text-xl font-bold uppercase">
              미가입 멤버 ({unlinkedMembers.length}명)
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              사전 등록된 멤버입니다. 해당 팀원이 카카오로 가입하면 자동 연동됩니다.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unlinkedMembers.map((member) => (
                <Card
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-4 border-[hsl(var(--warning))]/20 bg-[hsl(var(--warning))]/5 px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{member.name}</p>
                      <Badge variant="outline" className="border-[hsl(var(--warning))]/30 text-[hsl(var(--warning))] text-[10px] shrink-0">
                        미가입
                      </Badge>
                    </div>
                    {member.phone && (
                      <p className="text-xs text-muted-foreground">{formatPhone(member.phone)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {canChangeRole && (
                      <>
                        {linkingMemberId === member.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Select
                              onValueChange={(userId) => handleLink(member.id, userId)}
                              disabled={linkingId === member.id}
                            >
                              <SelectTrigger className="w-auto min-w-[110px] text-xs">
                                <SelectValue placeholder={linkingId === member.id ? "연동 중..." : "가입된 유저 선택"} />
                              </SelectTrigger>
                              <SelectContent>
                                {linkedMembers
                                  .filter((m) => m.id !== member.id)
                                  .map((m) => (
                                    <SelectItem key={m.id} value={membersData.members.find((r) => r.id === m.id)?.user_id ?? ""}>
                                      {m.name} {m.phone ? `(${formatPhone(m.phone)})` : ""}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLinkingMemberId(null)}
                              disabled={linkingId === member.id}
                            >
                              취소
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLinkingMemberId(member.id)}
                          >
                            계정 연결
                          </Button>
                        )}
                      </>
                    )}
                    {canKick && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(member.id, "DORMANT")}
                        >
                          휴면
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmAction({ message: `${member.name} 님을 제명하시겠습니까?`, onConfirm: () => handleKick(member.id) })}
                        >
                          제명
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Section 3: 멤버 목록 ── */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg sm:text-xl font-bold uppercase">
            멤버 목록
          </CardTitle>
          {!canViewAll && (
            <p className="mt-2 text-xs text-muted-foreground">
              평회원은 이름과 선호 포지션만 조회할 수 있습니다.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="이름으로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary/50 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            {filteredLinkedMembers.map((member) => (
              <div
                key={member.id}
                className="card-list-item flex flex-wrap items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{member.name}</p>
                  {canViewAll ? (
                    <p className="text-xs text-muted-foreground">
                      {formatPhone(member.phone)} · {member.birthDate}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    선호 포지션: {member.preferredPositions.join(" · ") || "미설정"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {canChangeRole ? (
                    <Select
                      value={member.role}
                      onValueChange={(value) => handleRoleChange(member.id, value as Role)}
                      disabled={changingRoleId === member.id}
                    >
                      <SelectTrigger className="w-auto min-w-[80px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRESIDENT">회장</SelectItem>
                        <SelectItem value="STAFF">운영진</SelectItem>
                        <SelectItem value="MEMBER">평회원</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                      {roleLabels[member.role]}
                    </Badge>
                  )}
                  {canKick && member.id !== userId ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(member.id, "DORMANT")}
                      >
                        휴면
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmAction({ message: `${member.name} 님을 제명하시겠습니까?`, onConfirm: () => handleKick(member.id) })}
                      >
                        제명
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
            {linkedMembers.length === 0 && (
              <EmptyState icon={Users} title="가입된 멤버가 없습니다" description="초대 코드를 공유해보세요." />
            )}
            {linkedMembers.length > 0 && filteredLinkedMembers.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 4: 휴면 회원 ── */}
      {dormantMembers.length > 0 && canViewAll && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg sm:text-xl font-bold uppercase">
              휴면 회원 ({dormantMembers.length}명)
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              장기 휴회 또는 활동 중단 회원입니다. 복귀 시 활동 회원으로 전환할 수 있습니다.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dormantMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/30 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-muted-foreground">{member.name}</p>
                    {member.isLinked && (
                      <p className="text-[11px] text-muted-foreground/60">
                        {member.preferredPositions.length > 0 ? member.preferredPositions.join(", ") : "포지션 미설정"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">휴면</Badge>
                    {canKick && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(member.id, "ACTIVE")}
                      >
                        복귀
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.message ?? ""}
        variant="destructive"
        confirmLabel="제명"
        onConfirm={() => { confirmAction?.onConfirm(); setConfirmAction(null); }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
