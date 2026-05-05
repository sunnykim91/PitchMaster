"use client";

import { useMemo, useState } from "react";
import { useApi, apiMutate } from "@/lib/useApi";
import type { DetailedPosition, Role } from "@/lib/types";
import { isPresident, isStaffOrAbove } from "@/lib/permissions";
import { GA } from "@/lib/analytics";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Users, ChevronDown } from "lucide-react";
import { useConfirm } from "@/lib/ConfirmContext";

type Member = {
  id: string;
  userIdRaw: string | null; // team_members.user_id (본인 식별용)
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
  coachPositions: string[];
  joinedAt: string;
  jerseyNumber: number | null;
  teamRole: string | null;
  dormantType: string | null;
  dormantUntil: string | null;
  dormantReason: string | null;
  profileImageUrl: string | null;
};

import type { ApiMemberRow, MembersInitialData } from "./initialData.types";

function mapApiMembers(rows: ApiMemberRow[]): Member[] {
  return rows.map((row) => ({
    id: row.id,
    userIdRaw: row.user_id,
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
    coachPositions: row.coach_positions ?? [],
    joinedAt: row.joined_at,
    jerseyNumber: row.jersey_number ?? null,
    teamRole: row.team_role ?? null,
    dormantType: row.dormant_type ?? null,
    dormantUntil: row.dormant_until ?? null,
    dormantReason: row.dormant_reason ?? null,
    profileImageUrl: row.users?.profile_image_url ?? null,
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
  initialData?: MembersInitialData;
}) {
  const { data: membersData, loading, error, refetch } = useApi<MembersInitialData>(
    "/api/members",
    initialData ?? { members: [], isStaff: false },
    { skip: !!initialData },
  );
  const members = useMemo(() => mapApiMembers(membersData.members), [membersData.members]);
  const confirm = useConfirm();
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
  const [sortBy, setSortBy] = useState<"none" | "name-asc" | "name-desc" | "joined-asc" | "joined-desc">("none");
  const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");

  // 감독 지정 포지션 편집
  const [editingCoachPos, setEditingCoachPos] = useState<string | null>(null);
  const [tempCoachPos, setTempCoachPos] = useState<string[]>([]);
  const [savingCoachPos, setSavingCoachPos] = useState(false);

  // 등번호 편집
  const [editingJerseyId, setEditingJerseyId] = useState<string | null>(null);
  const [tempJersey, setTempJersey] = useState<string>("");

  // 카드 확장 상태
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 휴면 설정 폼
  const [showDormantForm, setShowDormantForm] = useState<string | null>(null);
  const [dormantType, setDormantType] = useState<string>("INJURED");
  const [dormantUntil, setDormantUntil] = useState("");
  const [dormantReason, setDormantReason] = useState("");

  const DORMANT_LABELS: Record<string, string> = { INJURED: "부상", PERSONAL: "개인사정" };
  const DORMANT_ICONS: Record<string, string> = { INJURED: "🏥", PERSONAL: "✈️" };

  const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];

  const activeMembers = useMemo(() => members.filter((m) => m.status === "ACTIVE"), [members]);
  const dormantMembers = useMemo(() => members.filter((m) => m.status === "DORMANT"), [members]);
  const linkedMembers = useMemo(() => activeMembers.filter((m) => m.isLinked), [activeMembers]);
  const unlinkedMembers = useMemo(() => activeMembers.filter((m) => !m.isLinked), [activeMembers]);

  const filteredLinkedMembers = useMemo(() => {
    const roleOrder: Record<Role, number> = { PRESIDENT: 0, STAFF: 1, MEMBER: 2 };
    let list = linkedMembers;

    // 역할 필터
    if (roleFilter !== "ALL") {
      list = list.filter((m) => m.role === roleFilter);
    }

    // 검색
    if (searchQuery.trim()) {
      list = list.filter((m) => m.name.includes(searchQuery) || m.preName?.includes(searchQuery));
    }

    // 정렬
    return [...list].sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name, "ko");
      if (sortBy === "name-desc") return b.name.localeCompare(a.name, "ko");
      if (sortBy === "joined-asc") return a.joinedAt.localeCompare(b.joinedAt);
      if (sortBy === "joined-desc") return b.joinedAt.localeCompare(a.joinedAt);
      // none (기본): 회장 → 운영진 → 평회원, 같은 역할이면 이름순
      return (roleOrder[a.role] - roleOrder[b.role]) || a.name.localeCompare(b.name, "ko");
    });
  }, [linkedMembers, searchQuery, sortBy, roleFilter]);

  const stats = useMemo(() => {
    const counts = { PRESIDENT: 0, STAFF: 0, MEMBER: 0 } as Record<Role, number>;
    activeMembers.forEach((member) => {
      counts[member.role] += 1;
    });
    return { ...counts, DORMANT: dormantMembers.length };
  }, [activeMembers, dormantMembers]);

  async function doRoleChange(memberId: string, newRole: Role) {
    setChangingRoleId(memberId);
    try {
      const { error: err } = await apiMutate("/api/members", "PUT", { memberId, role: newRole });
      if (!err) {
        if (newRole === "PRESIDENT") {
          showToast(
            "회장 권한이 이양되었습니다. 본인은 자동으로 운영진(STAFF)으로 변경됩니다. 잘못 누르셨다면 새 회장님께 다시 회장 권한 부여를 요청해주세요.",
          );
          setTimeout(() => window.location.reload(), 1500);
          return;
        }
        showToast("역할이 변경되었습니다.");
        await refetch();
      } else {
        showToast(typeof err === "string" ? err : "역할 변경에 실패했습니다.", "error");
      }
    } finally {
      setChangingRoleId(null);
    }
  }

  async function handleRoleChange(memberId: string, newRole: Role) {
    if (!canChangeRole) return;
    const target = members.find((m) => m.id === memberId);
    const targetName = target?.name ?? "해당 회원";

    if (newRole === "PRESIDENT") {
      const ok = await confirm({
        title: `${targetName}님에게 회장을 이임할까요?`,
        description:
          "⚠️ 이임 후 본인은 자동으로 운영진(STAFF)으로 변경됩니다. 실수로 누르신 게 아닌지 한 번 더 확인해주세요. 되돌리려면 새 회장이 본인을 다시 회장으로 변경해야 합니다.",
        variant: "destructive",
        confirmLabel: "회장 이임",
      });
      if (ok) doRoleChange(memberId, newRole);
      return;
    }

    // STAFF·MEMBER 강등도 confirm 추가 (모바일 스크롤 우발 터치 방지)
    const roleLabel = newRole === "STAFF" ? "운영진(STAFF)" : "평회원(MEMBER)";
    const ok = await confirm({
      title: `${targetName}님을 ${roleLabel}으로 변경할까요?`,
      description:
        newRole === "MEMBER"
          ? "운영진 권한(회비·회원·경기 관리)이 모두 사라집니다."
          : "운영진 권한을 부여합니다. 회비·회원·경기 관리가 가능해집니다.",
      confirmLabel: "변경",
    });
    if (ok) doRoleChange(memberId, newRole);
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
      GA.memberPreRegister();
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

  async function handleStatusChange(memberId: string, newStatus: "ACTIVE" | "DORMANT", opts?: { dormantType?: string; dormantUntil?: string; dormantReason?: string }) {
    const { error: err } = await apiMutate("/api/members", "PUT", {
      action: "update_status",
      memberId,
      status: newStatus,
      ...(opts ?? {}),
    });
    if (!err) {
      if (newStatus === "DORMANT") {
        const label = DORMANT_LABELS[opts?.dormantType ?? ""] ?? "휴면";
        showToast(`${label} 처리되었습니다.`);
      } else {
        showToast("활동 회원으로 복귀했습니다.");
      }
      setShowDormantForm(null);
      await refetch();
    } else {
      showToast("상태 변경에 실패했습니다.", "error");
    }
  }

  async function handleSaveJersey(memberId: string) {
    const num = tempJersey.trim() === "" ? null : Number(tempJersey);
    const { error: err } = await apiMutate("/api/members", "PUT", {
      action: "update_jersey_number",
      memberId,
      jerseyNumber: num,
    });
    if (!err) {
      showToast("등번호가 변경되었습니다.");
      setEditingJerseyId(null);
      await refetch();
    } else {
      showToast(err, "error");
    }
  }

  async function handleTeamRoleChange(memberId: string, teamRole: string | null) {
    const { error: err } = await apiMutate("/api/members", "PUT", {
      action: "update_team_role",
      memberId,
      teamRole,
    });
    if (!err) {
      showToast(teamRole === "CAPTAIN" ? "주장으로 지정되었습니다." : teamRole === "VICE_CAPTAIN" ? "부주장으로 지정되었습니다." : "해제되었습니다.");
      await refetch();
    } else {
      showToast(err, "error");
    }
  }

  async function handleSaveCoachPositions(memberId: string) {
    setSavingCoachPos(true);
    try {
      const { error: err } = await apiMutate("/api/members", "PUT", {
        action: "update_coach_positions",
        memberId,
        coachPositions: tempCoachPos.length > 0 ? tempCoachPos : null,
      });
      if (!err) {
        showToast("감독 지정 포지션이 저장되었습니다.");
        setEditingCoachPos(null);
        await refetch();
      } else {
        showToast("저장에 실패했습니다.", "error");
      }
    } finally {
      setSavingCoachPos(false);
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
                <p className="text-xs text-muted-foreground">
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
            <CardTitle className="font-heading text-lg sm:text-2xl font-bold uppercase">
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
                  className="flex flex-wrap items-center justify-between gap-4 border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{member.name}</p>
                      <Badge variant="outline" className="border-[hsl(var(--warning))]/30 text-[hsl(var(--warning))] text-xs shrink-0">
                        미가입
                      </Badge>
                    </div>
                    {member.phone && (
                      <p className="text-xs text-muted-foreground">{formatPhone(member.phone)}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canChangeRole && (
                      <>
                        {linkingMemberId === member.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Select
                              onValueChange={(userId) => handleLink(member.id, userId)}
                              disabled={linkingId === member.id}
                            >
                              <SelectTrigger className="w-auto min-w-[110px] text-xs">
                                <SelectValue placeholder={linkingId === member.id ? "연동 중..." : "가입된 회원 선택"} />
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
                          disabled={kickingId === member.id}
                          onClick={async () => {
                            const ok = await confirm({ title: `${member.name} 님을 제명할까요?`, variant: "destructive", confirmLabel: "제명" });
                            if (ok) handleKick(member.id);
                          }}
                        >
                          {kickingId === member.id ? "처리 중..." : "제명"}
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
          <CardTitle className="font-heading text-lg sm:text-2xl font-bold uppercase">
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
              list="member-names"
              autoComplete="off"
              className="w-full rounded-lg border border-border bg-secondary/50 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <datalist id="member-names">
              {linkedMembers.map((m) => <option key={m.id} value={m.name} />)}
            </datalist>
          </div>
          {/* 정렬 + 역할 필터 */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {([
                { key: "name", cycle: ["none", "name-asc", "name-desc"] as string[], labels: ["이름", "이름 ↑", "이름 ↓"] },
                { key: "joined", cycle: ["none", "joined-asc", "joined-desc"] as string[], labels: ["가입", "가입 ↑", "가입 ↓"] },
              ]).map(({ key, cycle, labels }) => {
                const idx = cycle.indexOf(sortBy);
                const isActive = idx > 0;
                const label = isActive ? labels[idx] : labels[0];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      const nextIdx = idx < 0 ? 1 : (idx + 1) % 3;
                      setSortBy(cycle[nextIdx] as typeof sortBy);
                    }}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1">
              {([
                { value: "ALL" as const, label: "전체" },
                { value: "PRESIDENT" as const, label: "회장" },
                { value: "STAFF" as const, label: "운영진" },
                { value: "MEMBER" as const, label: "평회원" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRoleFilter(opt.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    roleFilter === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-auto">{filteredLinkedMembers.length}명</span>
          </div>
          <div className="space-y-2">
            {filteredLinkedMembers.map((member) => {
              const isExpanded = expandedId === member.id;
              const isEditing = editingCoachPos === member.id || editingJerseyId === member.id;
              // 일반 회원에게는 아코디언 노출 안 함 — 펼쳐도 운영진 전용 정보(연락처·생일)·관리 버튼이라 빈 컨텐츠.
              // 본인 등번호 편집은 /settings 페이지에 이미 있음.
              // 감독 지정 포지션은 운영 정보라 일반 회원에게 표시 안 함 (375px 좁은 화면 넘침 방지).
              const isStaffViewer = isStaffOrAbove(role);
              const positionLine = member.preferredPositions.join(" · ") || "포지션 미설정";
              return (
              <div
                key={member.id}
                className={cn(
                  "rounded-xl border border-border/50 transition-colors",
                  isExpanded && "border-primary/30 bg-primary/3"
                )}
              >
                {/* ── 기본 행: 항상 표시 ── */}
                {isStaffViewer ? (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    onClick={() => { if (!isEditing) setExpandedId(isExpanded ? null : member.id); }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border">
                          {member.profileImageUrl ? (
                            <img src={member.profileImageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground">{member.name.charAt(0)}</span>
                          )}
                        </span>
                        {member.jerseyNumber !== null && (
                          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">#{member.jerseyNumber}</span>
                        )}
                        <span className="truncate">{member.name}</span>
                        {member.teamRole === "CAPTAIN" && (
                          <Badge variant="warning" className="text-xs px-1.5 py-0 shrink-0">주장</Badge>
                        )}
                        {member.teamRole === "VICE_CAPTAIN" && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 shrink-0">부주장</Badge>
                        )}
                        {member.status === "DORMANT" && member.dormantType && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 bg-muted-foreground/15 text-muted-foreground">
                            {DORMANT_ICONS[member.dormantType]} {DORMANT_LABELS[member.dormantType] ?? "휴면"}
                            {member.dormantUntil && (
                              <span className="ml-0.5">~{member.dormantUntil.slice(5)}</span>
                            )}
                          </Badge>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {positionLine}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                        {roleLabels[member.role]}
                      </Badge>
                      <ChevronDown className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isExpanded && "rotate-180"
                      )} aria-hidden="true" />
                    </div>
                  </button>
                ) : (
                  // 일반 회원: 단순 정보 행 (펼침 없음)
                  <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border">
                          {member.profileImageUrl ? (
                            <img src={member.profileImageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground">{member.name.charAt(0)}</span>
                          )}
                        </span>
                        {member.jerseyNumber !== null && (
                          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">#{member.jerseyNumber}</span>
                        )}
                        <span className="truncate">{member.name}</span>
                        {member.teamRole === "CAPTAIN" && (
                          <Badge variant="warning" className="text-xs px-1.5 py-0 shrink-0">주장</Badge>
                        )}
                        {member.teamRole === "VICE_CAPTAIN" && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 shrink-0">부주장</Badge>
                        )}
                        {member.status === "DORMANT" && member.dormantType && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 bg-muted-foreground/15 text-muted-foreground">
                            {DORMANT_ICONS[member.dormantType]} {DORMANT_LABELS[member.dormantType] ?? "휴면"}
                            {member.dormantUntil && (
                              <span className="ml-0.5">~{member.dormantUntil.slice(5)}</span>
                            )}
                          </Badge>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {coachInline}
                      </p>
                    </div>
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs shrink-0">
                      {roleLabels[member.role]}
                    </Badge>
                  </div>
                )}

                {/* ── 확장 영역: 운영진 + 펼침 시에만 ── */}
                {isStaffViewer && isExpanded && (
                  <div className="border-t border-border/20 px-4 py-3 space-y-3">
                    {/* 상세 정보 */}
                    {canViewAll && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {member.phone && (
                          <div>
                            <span className="text-muted-foreground">연락처</span>
                            <p className="font-medium">{formatPhone(member.phone)}</p>
                          </div>
                        )}
                        {member.birthDate && (
                          <div>
                            <span className="text-muted-foreground">생년월일</span>
                            <p className="font-medium">{member.birthDate}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 감독 지정 포지션 */}
                    {member.coachPositions.length > 0 && editingCoachPos !== member.id && (
                      <p className="text-xs text-primary font-medium">
                        감독 지정: {member.coachPositions.join(" · ")}
                      </p>
                    )}

                    {/* 등번호 인라인 편집 */}
                    {editingJerseyId === member.id && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={999}
                          value={tempJersey}
                          onChange={(e) => setTempJersey(e.target.value)}
                          placeholder="번호"
                          className="w-20 h-8 text-xs"
                        />
                        <Button size="sm" className="h-7 px-3 text-xs" onClick={() => handleSaveJersey(member.id)}>저장</Button>
                        <Button size="sm" variant="outline" className="h-7 px-3 text-xs" onClick={() => setEditingJerseyId(null)}>취소</Button>
                      </div>
                    )}

                    {/* 감독 포지션 편집기 */}
                    {editingCoachPos === member.id && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">감독 지정 포지션 선택</p>
                        <div className="flex flex-wrap gap-1">
                          {POSITIONS.map((pos) => {
                            const selected = tempCoachPos.includes(pos);
                            return (
                              <button
                                key={pos}
                                type="button"
                                aria-label={`${pos} ${selected ? "선택됨" : "미선택"}`}
                                aria-pressed={selected}
                                onClick={() =>
                                  setTempCoachPos((prev) =>
                                    selected ? prev.filter((p) => p !== pos) : [...prev, pos]
                                  )
                                }
                                className={cn(
                                  "rounded px-2 py-1 text-xs font-medium border transition-colors",
                                  selected
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                                )}
                              >
                                {pos}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" onClick={() => handleSaveCoachPositions(member.id)} disabled={savingCoachPos} className="h-7 px-3 text-xs">
                            {savingCoachPos ? "저장 중..." : "저장"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingCoachPos(null)} disabled={savingCoachPos} className="h-7 px-3 text-xs">취소</Button>
                        </div>
                      </div>
                    )}

                    {/* 관리 버튼들 */}
                    {(isStaffOrAbove(role) || canChangeRole || member.userIdRaw === userId) && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(isStaffOrAbove(role) || member.userIdRaw === userId) && editingJerseyId !== member.id && (
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setEditingJerseyId(member.id); setTempJersey(member.jerseyNumber !== null ? String(member.jerseyNumber) : ""); }}>
                            등번호
                          </Button>
                        )}
                        {(canChangeRole || isStaffOrAbove(role)) && editingCoachPos !== member.id && (
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setEditingCoachPos(member.id); setTempCoachPos(member.coachPositions); }}>
                            감독 지정
                          </Button>
                        )}
                        {isStaffOrAbove(role) && (
                          <Select value={member.teamRole ?? "NONE"} onValueChange={(v) => handleTeamRoleChange(member.id, v === "NONE" ? null : v)}>
                            <SelectTrigger className="w-auto min-w-[80px] text-xs h-8">
                              <SelectValue placeholder="주장/부주장" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">역할 없음</SelectItem>
                              <SelectItem value="CAPTAIN">주장</SelectItem>
                              <SelectItem value="VICE_CAPTAIN">부주장</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {canChangeRole && member.userIdRaw !== userId && (
                          <Select value={member.role} onValueChange={(value) => handleRoleChange(member.id, value as Role)} disabled={changingRoleId === member.id}>
                            <SelectTrigger className="w-auto min-w-[88px] text-xs h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PRESIDENT">회장</SelectItem>
                              <SelectItem value="STAFF">운영진</SelectItem>
                              <SelectItem value="MEMBER">평회원</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {canKick && member.userIdRaw !== userId && (
                          <>
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setShowDormantForm(member.id); setDormantType("INJURED"); setDormantUntil(""); setDormantReason(""); }}>
                              휴면 설정
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-xs text-destructive hover:bg-destructive/10" disabled={kickingId === member.id} onClick={async () => { const ok = await confirm({ title: `${member.name} 님을 제명할까요?`, variant: "destructive", confirmLabel: "제명" }); if (ok) handleKick(member.id); }}>{kickingId === member.id ? "처리 중..." : "제명"}</Button>
                          </>
                        )}
                      </div>
                    )}

                    {/* 휴면 설정 폼 */}
                    {showDormantForm === member.id && (
                      <div className="mt-3 rounded-lg border border-primary/20 bg-card p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">사유</Label>
                            <NativeSelect value={dormantType} onChange={(e) => setDormantType(e.target.value)} className="h-9 text-sm">
                              <option value="INJURED">🏥 부상</option>
                              <option value="PERSONAL">✈️ 개인사정</option>
                            </NativeSelect>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">복귀 예정일</Label>
                            <Input type="date" value={dormantUntil} onChange={(e) => setDormantUntil(e.target.value)} className="h-9 text-sm" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">메모 (선택)</Label>
                          <Input value={dormantReason} onChange={(e) => setDormantReason(e.target.value)} placeholder="예: 무릎 인대 부상, 해외 출장" className="h-9 text-sm" />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="ghost" size="sm" onClick={() => setShowDormantForm(null)}>취소</Button>
                          <Button size="sm" onClick={() => handleStatusChange(member.id, "DORMANT", { dormantType, dormantUntil: dormantUntil || undefined, dormantReason: dormantReason || undefined })}>
                            휴면 처리
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
            {linkedMembers.length === 0 && (
              <EmptyState
                icon={Users}
                title="가입된 멤버가 없습니다"
                description={
                  canPreRegister
                    ? "초대 코드를 공유하거나, 전화번호로 사전 등록해두면 가입 시 자동 연동돼요."
                    : "초대 코드를 공유해보세요."
                }
                action={
                  canPreRegister && !showRegForm ? (
                    <Button size="sm" variant="outline" onClick={() => setShowRegForm(true)}>
                      팀원 사전 등록
                    </Button>
                  ) : undefined
                }
              />
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
            <CardTitle className="font-heading text-lg sm:text-2xl font-bold uppercase">
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
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-muted-foreground">{member.name}</p>
                      {member.dormantType && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted-foreground/15 text-muted-foreground">
                          {DORMANT_ICONS[member.dormantType]} {DORMANT_LABELS[member.dormantType]}
                          {member.dormantUntil && <span className="ml-0.5">~{member.dormantUntil.slice(5)}</span>}
                        </Badge>
                      )}
                    </div>
                    {(member.dormantReason || (member.isLinked && member.preferredPositions.length > 0)) && (
                      <p className="text-xs text-muted-foreground/60">
                        {member.dormantReason || member.preferredPositions.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!member.dormantType && <Badge variant="secondary" className="text-xs">휴면</Badge>}
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

    </div>
  );
}
