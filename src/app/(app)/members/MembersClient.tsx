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

type Member = {
  id: string;
  name: string;
  role: Role;
  preferredPositions: DetailedPosition[];
  preferredFoot: "RIGHT" | "LEFT" | "BOTH";
  phone: string;
  birthDate: string;
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
  const [confirmKick, setConfirmKick] = useState<string | null>(null);
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

  const linkedMembers = useMemo(() => members.filter((m) => m.isLinked), [members]);
  const unlinkedMembers = useMemo(() => members.filter((m) => !m.isLinked), [members]);

  const stats = useMemo(() => {
    const counts = { PRESIDENT: 0, STAFF: 0, MEMBER: 0 } as Record<Role, number>;
    members.forEach((member) => {
      counts[member.role] += 1;
    });
    return counts;
  }, [members]);

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
      setConfirmKick(null);
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
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-teal-400">Members</p>
              <CardTitle className="mt-1 font-heading text-2xl font-bold uppercase">회원 관리</CardTitle>
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
                  {showRegForm ? "닫기" : "팀원 사전등록"}
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

      {/* ── Section 2: 미연동 멤버 ── */}
      {unlinkedMembers.length > 0 && canViewAll && (
        <Card>
          <CardHeader>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400">Unlinked</p>
            <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
              미연동 멤버 ({unlinkedMembers.length}명)
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
                  className="flex flex-wrap items-center justify-between gap-4 border-amber-500/20 bg-amber-500/5 px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{member.name}</p>
                      <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-[10px]">
                        미연동
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
                              <SelectTrigger className="w-auto min-w-[140px] text-xs">
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
                            수동 연동
                          </Button>
                        )}
                      </>
                    )}
                    {canKick && (
                      confirmKick === member.id ? (
                        <div className="flex gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleKick(member.id)}
                            disabled={kickingId === member.id}
                          >
                            {kickingId === member.id ? "처리 중..." : "확인"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmKick(null)}
                            disabled={kickingId === member.id}
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
                          제명
                        </Button>
                      )
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
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-teal-400">Roster</p>
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
            {linkedMembers.map((member) => (
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
                    선호 포지션: {member.preferredPositions.join(" · ") || "미설정"}
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
                    <Select
                      value={member.role}
                      onValueChange={(value) => handleRoleChange(member.id, value as Role)}
                      disabled={changingRoleId === member.id}
                    >
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
                  {canKick && member.id !== userId ? (
                    confirmKick === member.id ? (
                      <div className="flex gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleKick(member.id)}
                          disabled={kickingId === member.id}
                        >
                          {kickingId === member.id ? "처리 중..." : "확인"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmKick(null)}
                          disabled={kickingId === member.id}
                        >
                          취소
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setConfirmKick(member.id)}>제명</Button>
                    )
                  ) : null}
                </div>
              </Card>
            ))}
            {linkedMembers.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">가입된 멤버가 없습니다.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
