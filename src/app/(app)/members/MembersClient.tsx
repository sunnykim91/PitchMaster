"use client";

import "@/app/onboarding/onboarding.css";
import { createPortal } from "react-dom";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useApi, apiMutate } from "@/lib/useApi";
import { useToast } from "@/lib/ToastContext";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { isPresident, isStaffOrAbove } from "@/lib/permissions";
import { GA } from "@/lib/analytics";
import type { DetailedPosition, Role } from "@/lib/types";
import { formatPhone } from "@/lib/utils";
import { MemberBulkUploadModal } from "@/components/MemberBulkUploadModal";
import { MemberEditModal } from "@/components/MemberEditModal";
import type { ApiMemberRow, MembersInitialData } from "./initialData.types";

type Member = {
  id: string;
  userIdRaw: string | null;
  name: string;
  role: Role;
  preferredPositions: DetailedPosition[];
  preferredFoot: "RIGHT" | "LEFT" | "BOTH";
  phone: string;
  birthDate: string;
  status: string;
  isLinked: boolean;
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

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];

const DORMANT_LABELS: Record<string, string> = {
  INJURED: "부상",
  PERSONAL: "개인사정",
  OTHER: "기타",
};

// 통합 필터 (옵션 C — single-select chip row, status·role 의미 혼합)
type FilterKey = "all" | "ACTIVE" | "DORMANT" | "STAFF_PLUS" | "MEMBER_ONLY";
type SortKey = "joined_desc" | "name_asc";

const SORT_OPTS: Array<{ value: SortKey; label: string }> = [
  { value: "joined_desc", label: "최신순" },
  { value: "name_asc", label: "이름 가나다" },
];

function sortMembers(arr: Member[], sort: SortKey): Member[] {
  const c = [...arr];
  switch (sort) {
    case "joined_desc":
      return c.sort((a, b) => (b.joinedAt || "").localeCompare(a.joinedAt || ""));
    case "name_asc":
      return c.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    default:
      return c;
  }
}

// 화면 표시용: 휴면 사유별 라벨·dot 구분 (필터는 ACTIVE/DORMANT 2종으로 단순화)
function displayStatusDot(m: Member): "success" | "muted" | "warning" | "info" {
  if (m.status === "ACTIVE") return "success";
  if (m.dormantType === "INJURED") return "warning";
  if (m.dormantType === "OTHER") return "info";
  return "muted";
}

function displayStatusLabel(m: Member): string {
  if (m.status === "ACTIVE") return "활성";
  if (m.dormantType === "INJURED") return "부상";
  if (m.dormantType === "OTHER") return "기타";
  return "휴면";
}

const ROLE_HUE: Record<Role, "atk" | "def" | "neutral"> = {
  PRESIDENT: "atk",
  STAFF: "def",
  MEMBER: "neutral",
};

const ROLE_LABEL: Record<Role, string> = {
  PRESIDENT: "회장",
  STAFF: "운영진",
  MEMBER: "회원",
};

export default function MembersClient({
  userRole,
  userId,
  initialData,
  teamId: _teamId,
  teamName,
  inviteCode,
}: {
  userRole?: Role;
  userId: string;
  initialData?: MembersInitialData;
  teamId: string;
  teamName?: string;
  inviteCode?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);

  const { data: membersData, loading, error, refetch } = useApi<MembersInitialData>(
    "/api/members",
    initialData ?? { members: [], isStaff: false, sportType: null },
    { skip: !!initialData },
  );
  const members = useMemo(() => mapApiMembers(membersData.members), [membersData.members]);

  const canChangeRole = isPresident(role);
  const canKick = isPresident(role);
  const canPreRegister = isStaffOrAbove(role);
  const canBulk = isPresident(role);

  const searchParams = useSearchParams();
  const [showBulk, setShowBulk] = useState(() => searchParams.get("bulk") === "true");
  const [showSingleAdd, setShowSingleAdd] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  // 안정적 콜백 — MemberRow memo 가 검색 타이핑 시 전 행 리렌더되지 않도록 (행마다 새 클로저 생성 방지)
  const handleSelectMember = useCallback((id: string) => setEditingMemberId(id), []);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("joined_desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  // 사전 등록 단건 (PRESIDENT/STAFF) — 시안 mini modal
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);

  async function doRoleChange(memberId: string, newRole: Role) {
    setChangingRoleId(memberId);
    try {
      const { error: err } = await apiMutate("/api/members", "PUT", { memberId, role: newRole });
      if (!err) {
        if (newRole === "PRESIDENT") {
          showToast(
            "회장 권한이 이양되었습니다. 본인은 자동으로 운영진(STAFF)으로 변경됩니다.",
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
    // V2 MemberEditModal의 inline confirm(pm-confirm)에서 이미 사용자 확인 받음 → 즉시 실행
    if (!canChangeRole) return;
    await doRoleChange(memberId, newRole);
  }

  async function handleKick(memberId: string): Promise<boolean> {
    if (!canKick) return false;
    setKickingId(memberId);
    try {
      const { error: err } = await apiMutate(`/api/members?memberId=${memberId}`, "DELETE");
      if (!err) {
        showToast("멤버가 제거되었습니다.");
        await refetch();
        return true;
      }
      showToast(typeof err === "string" ? err : "제명에 실패했습니다.", "error");
      return false;
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
      setShowSingleAdd(false);
      await refetch();
    } else {
      showToast(typeof err === "string" ? err : "등록에 실패했습니다.", "error");
    }
  }

  async function handleStatusChange(
    memberId: string,
    newStatus: "ACTIVE" | "DORMANT",
    opts?: { dormantType?: string; dormantUntil?: string; dormantReason?: string },
  ) {
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
      await refetch();
    } else {
      showToast("상태 변경에 실패했습니다.", "error");
    }
  }

  async function handleTeamRoleChange(memberId: string, teamRole: string | null) {
    const { error: err } = await apiMutate("/api/members", "PUT", {
      action: "update_team_role",
      memberId,
      teamRole,
    });
    if (!err) {
      showToast(
        teamRole === "CAPTAIN"
          ? "주장으로 지정되었습니다."
          : teamRole === "VICE_CAPTAIN"
          ? "부주장으로 지정되었습니다."
          : "해제되었습니다.",
      );
      await refetch();
    } else {
      showToast(typeof err === "string" ? err : "지정 실패", "error");
    }
  }

  async function handleSaveJersey(memberId: string, value: number | null) {
    const { error: err } = await apiMutate("/api/members", "PUT", {
      action: "update_jersey_number",
      memberId,
      jerseyNumber: value,
    });
    if (err) {
      showToast(typeof err === "string" ? err : "등번호 저장 실패", "error");
      return;
    }
    showToast("등번호가 저장되었습니다.");
    await refetch();
  }

  async function handleSaveCoachPositions(memberId: string, positions: string[]) {
    const { error: err } = await apiMutate("/api/members", "PUT", {
      action: "update_coach_positions",
      memberId,
      coachPositions: positions.length > 0 ? positions : null,
    });
    if (err) {
      showToast(typeof err === "string" ? err : "포지션 저장 실패", "error");
      return;
    }
    showToast("감독 지정 포지션이 저장되었습니다.");
    await refetch();
  }

  // 필터링 + 검색 + 정렬 (single-select chip)
  const filtered = useMemo(() => {
    let list = members;
    switch (filter) {
      case "ACTIVE":
        list = list.filter((m) => m.status === "ACTIVE");
        break;
      case "DORMANT":
        list = list.filter((m) => m.status === "DORMANT");
        break;
      case "STAFF_PLUS":
        list = list.filter((m) => isStaffOrAbove(m.role));
        break;
      case "MEMBER_ONLY":
        list = list.filter((m) => m.role === "MEMBER");
        break;
    }
    const q = searchQuery.trim();
    if (q) {
      list = list.filter((m) => m.name.includes(q) || m.preName?.includes(q) || m.phone.includes(q));
    }
    return sortMembers(list, sort);
  }, [members, filter, searchQuery, sort]);

  // 계정 연결용 가입자 풀 (linked + 본인 자체전 제외)
  const signupPool = useMemo(() => {
    return membersData.members
      .filter((r) => r.user_id && r.users)
      .map((r) => ({
        userId: r.user_id as string,
        name: r.users?.name || "이름 없음",
        phone: r.users?.phone || r.pre_phone || "",
      }));
  }, [membersData.members]);

  async function handleLink(memberId: string, userId: string): Promise<boolean> {
    const { error: err } = await apiMutate("/api/members", "POST", {
      action: "link",
      memberId,
      userId,
    });
    if (!err) {
      showToast("계정이 연결되었습니다.");
      await refetch();
      return true;
    }
    showToast(typeof err === "string" ? err : "연결에 실패했습니다.", "error");
    return false;
  }

  const counts = useMemo(() => {
    const c = {
      all: members.length,
      ACTIVE: 0,
      DORMANT: 0,
      STAFF_PLUS: 0,
      MEMBER_ONLY: 0,
    };
    members.forEach((m) => {
      if (m.status === "ACTIVE") c.ACTIVE += 1;
      else if (m.status === "DORMANT") c.DORMANT += 1;
      if (isStaffOrAbove(m.role)) c.STAFF_PLUS += 1;
      else if (m.role === "MEMBER") c.MEMBER_ONLY += 1;
    });
    return c;
  }, [members]);

  const editingMember = editingMemberId ? members.find((m) => m.id === editingMemberId) : null;

  return (
    <div className="pm-page pm-page--members">
      <div className="pm-amb" aria-hidden />

      {/* App bar */}
      <header className="pm-appbar">
        <button
          type="button"
          className="pm-appbar-icon"
          aria-label="뒤로"
          onClick={() => router.back()}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path
              d="M11 4 6 9l5 5"
              stroke="currentColor"
              strokeWidth="1.7"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="pm-appbar-title">
          회원 <span className="pm-appbar-count">{members.length}</span>
        </div>
        {canPreRegister ? (
          <button
            type="button"
            className="pm-appbar-icon"
            aria-label="한 명씩 추가"
            onClick={() => setShowSingleAdd(true)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path
                d="M9 4v10M4 9h10"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : (
          <span className="pm-appbar-icon" aria-hidden />
        )}
      </header>

      <main className="pm-main pm-main--members">
        {loading ? (
          <div className="pm-card" style={{ padding: 24 }}>
            <p style={{ color: "hsl(var(--muted-foreground))", textAlign: "center" }}>
              불러오는 중…
            </p>
          </div>
        ) : error ? (
          <div className="pm-notice pm-notice--err">
            <span>오류: {error}</span>
          </div>
        ) : (
          <>
            {/* Paste hero */}
            {canBulk &&
              (members.length === 0 ? (
                <div className="pm-paste-hero">
                  <div className="pm-amb" aria-hidden />
                  <div className="pm-hero-inner">
                    <div className="pm-chip" style={{ marginTop: 0 }}>
                      <span className="pm-chip-dot" />
                      <span>팀원 등록 · 1단계</span>
                    </div>
                    <h2 className="pm-h1 pm-h1--hero">
                      팀원을 등록해<br />
                      보세요.
                    </h2>
                    <p className="pm-sub" style={{ marginBottom: 4 }}>
                      카톡 단체방 명단을 그대로 붙여넣으면 돼요.
                      <br />
                      이름·전화번호를 자동으로 인식해요.
                    </p>
                    <button type="button" className="pm-paste-cta" onClick={() => setShowBulk(true)}>
                      <span className="pm-paste-cta-icon" aria-hidden>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <rect
                            x="5"
                            y="2.5"
                            width="10"
                            height="15"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            fill="none"
                          />
                          <path
                            d="M8 5.5h4M8 9h4M8 12.5h4"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                      <div className="pm-paste-cta-body">
                        <div className="pm-paste-cta-label">카톡 명단 붙여넣기</div>
                        <div className="pm-paste-cta-sub">한 번에 최대 200명</div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                        <path
                          d="M3 7h8M8 4l3 3-3 3"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <div className="pm-paste-or">
                      <span /><span>또는</span><span />
                    </div>
                    <button
                      type="button"
                      className="pm-paste-secondary"
                      onClick={() => setShowSingleAdd(true)}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                        <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      한 명씩 추가하기
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="pm-paste-strip"
                  onClick={() => setShowBulk(true)}
                >
                  <div className="pm-paste-strip-icon" aria-hidden>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect
                        x="4"
                        y="2"
                        width="8"
                        height="12"
                        rx="1.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      />
                      <path d="M6 5h4M6 8h4M6 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="pm-paste-strip-body">
                    <div className="pm-paste-strip-label">카톡으로 더 추가</div>
                    <div className="pm-paste-strip-sub">명단 붙여넣기 · 자동 인식</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                    <path
                      d="M5 3l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ))}

            {/* Search */}
            {members.length > 0 && (
              <div className="pm-card" style={{ padding: 10 }}>
                <div className="pm-search-wrap">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    className="pm-search-icon"
                    aria-hidden
                  >
                    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
                    <path
                      d="m10.5 10.5 3 3"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    className="pm-input pm-input--search"
                    placeholder="이름·전화번호로 검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="회원 검색"
                  />
                </div>
              </div>
            )}

            {/* Sort row */}
            {members.length > 0 && (
              <div className="pm-sort-row">
                <div className="pm-sort-chips">
                  {SORT_OPTS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className={`pm-sort-chip ${sort === o.value ? "is-on" : ""}`}
                      onClick={() => setSort(o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <div className="pm-sort-total">총 {filtered.length}명</div>
              </div>
            )}

            {/* Filter chips — 통합 single-select row */}
            {members.length > 0 && (
              <div className="pm-filters">
                <FilterChip
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                  label="전체"
                  count={filter === "all" ? counts.all : undefined}
                />
                <FilterChip
                  active={filter === "ACTIVE"}
                  onClick={() => setFilter("ACTIVE")}
                  label="활성"
                  count={filter === "ACTIVE" ? counts.ACTIVE : undefined}
                  dot="success"
                />
                <FilterChip
                  active={filter === "DORMANT"}
                  onClick={() => setFilter("DORMANT")}
                  label="휴면"
                  count={filter === "DORMANT" ? counts.DORMANT : undefined}
                  dot="muted"
                />
                <FilterChip
                  active={filter === "STAFF_PLUS"}
                  onClick={() => setFilter("STAFF_PLUS")}
                  label="운영진+"
                  count={filter === "STAFF_PLUS" ? counts.STAFF_PLUS : undefined}
                />
                <FilterChip
                  active={filter === "MEMBER_ONLY"}
                  onClick={() => setFilter("MEMBER_ONLY")}
                  label="평회원"
                  count={filter === "MEMBER_ONLY" ? counts.MEMBER_ONLY : undefined}
                />
              </div>
            )}

            {/* Member list */}
            {members.length > 0 && (
              <div className="pm-card pm-mlist">
                {filtered.length === 0 ? (
                  <div className="pm-empty">이 분류에 해당하는 회원이 없어요.</div>
                ) : (
                  filtered.map((m, i) => (
                    <div key={m.id}>
                      {i > 0 && <div className="pm-mrow-div" />}
                      <MemberRow
                        m={m}
                        onSelect={handleSelectMember}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Member 일반회원 안내 */}
            {role === "MEMBER" && (
              <div
                className="pm-card"
                style={{
                  padding: "14px 16px",
                  color: "hsl(var(--muted-foreground))",
                  fontSize: 12.5,
                  textAlign: "center",
                }}
              >
                회원은 명단을 조회할 수 있어요. 등록은 회장·운영진이 진행해요.
              </div>
            )}
          </>
        )}
      </main>

      {/* Bulk modal (시안 v2) */}
      <MemberBulkUploadModal
        open={showBulk}
        onClose={() => setShowBulk(false)}
        onSuccess={refetch}
        teamName={teamName}
        inviteCode={inviteCode}
      />

      {/* 단건 사전 등록 mini modal */}
      <SingleAddModal
        open={showSingleAdd}
        onClose={() => setShowSingleAdd(false)}
        name={regName}
        phone={regPhone}
        onNameChange={setRegName}
        onPhoneChange={setRegPhone}
        submitting={regSubmitting}
        onSubmit={handlePreRegister}
      />

      {/* 기존 detail modal (v1 톤, 후속 작업에서 시안 톤으로 마이그) */}
      {editingMember && (
        <MemberEditModal
          open={!!editingMemberId}
          onClose={() => setEditingMemberId(null)}
          member={{
            id: editingMember.id,
            name: editingMember.name,
            role: editingMember.role,
            status: editingMember.status,
            jerseyNumber: editingMember.jerseyNumber,
            coachPositions: editingMember.coachPositions,
            teamRole: editingMember.teamRole,
            dormantType: editingMember.dormantType,
            dormantUntil: editingMember.dormantUntil,
            dormantReason: editingMember.dormantReason,
            phone: editingMember.phone || undefined,
            birthDate: editingMember.birthDate || undefined,
            profileImageUrl: editingMember.profileImageUrl,
            isLinked: editingMember.isLinked,
          }}
          positions={POSITIONS}
          sport={membersData.sportType === "FUTSAL" ? "FUTSAL" : "SOCCER"}
          isSelf={editingMember.userIdRaw === userId}
          isStaffOrAbove={isStaffOrAbove(role)}
          canChangeRole={canChangeRole}
          canKick={canKick}
          onSaveJersey={handleSaveJersey}
          onSaveCoachPositions={handleSaveCoachPositions}
          onTeamRoleChange={handleTeamRoleChange}
          onRoleChange={handleRoleChange}
          onSetDormant={async (memberId, type, until, reason) => {
            await handleStatusChange(memberId, "DORMANT", {
              dormantType: type,
              dormantUntil: until || undefined,
              dormantReason: reason || undefined,
            });
          }}
          onUnsetDormant={async (memberId) => {
            await handleStatusChange(memberId, "ACTIVE");
          }}
          onKick={handleKick}
          signupPool={signupPool}
          onLink={handleLink}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MemberRow
// ─────────────────────────────────────────────────────────────
const MemberRow = memo(function MemberRow({ m, onSelect }: { m: Member; onSelect: (id: string) => void }) {
  const dot = displayStatusDot(m);
  const label = displayStatusLabel(m);
  const hue = ROLE_HUE[m.role];
  // 포지션은 대표 2개만 노출, 나머지는 +N개로 축약 (좁은 행 넘침 방지)
  const shownPositions = m.preferredPositions.slice(0, 2);
  const extraPositions = m.preferredPositions.length - shownPositions.length;
  return (
    <button type="button" className="pm-mrow" onClick={() => onSelect(m.id)}>
      <div className={`pm-mrow-av pm-hue--${hue}`} aria-hidden>
        {m.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.profileImageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="pm-mrow-av-img"
            referrerPolicy="no-referrer"
          />
        ) : (
          m.name.slice(0, 1)
        )}
      </div>
      <div className="min-w-0">
        <div className="pm-mrow-head">
          <span className="pm-mrow-name">{m.name}</span>
          {m.jerseyNumber !== null && (
            <span className="pm-mrow-jersey">
              <span className="pm-mrow-jersey-hash">#</span>{m.jerseyNumber}
            </span>
          )}
          {m.role !== "MEMBER" && (
            <span className={`pm-rolebadge pm-hue--${hue}`}>{ROLE_LABEL[m.role]}</span>
          )}
          {m.teamRole === "CAPTAIN" && (
            <span className="pm-rolebadge pm-rolebadge--cap">주장</span>
          )}
          {m.teamRole === "VICE_CAPTAIN" && (
            <span className="pm-rolebadge pm-rolebadge--vice">부주장</span>
          )}
          {!m.isLinked && (
            <span className="pm-rolebadge pm-rolebadge--unlinked">미가입</span>
          )}
        </div>
        <div className="pm-mrow-meta">
          <span className={`pm-statusdot pm-statusdot--${dot}`} />
          <span className="pm-mrow-metaline">
            <span>{label}</span>
            {shownPositions.length > 0 && (
              <>
                <span className="pm-mrow-sep">·</span>
                <span className="pm-mrow-pos">
                  {shownPositions.join(" · ")}
                  {extraPositions > 0 && <span className="pm-mrow-pos-more">+{extraPositions}</span>}
                </span>
              </>
            )}
            {m.phone && (
              <>
                <span className="pm-mrow-sep">·</span>
                <span>{formatPhone(m.phone)}</span>
              </>
            )}
          </span>
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" className="pm-mrow-caret" aria-hidden>
        <path
          d="M5 3l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
});

// ─────────────────────────────────────────────────────────────
// FilterChip
// ─────────────────────────────────────────────────────────────
function FilterChip({
  active,
  onClick,
  label,
  count,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  dot?: "success" | "warning" | "info" | "muted";
}) {
  return (
    <button type="button" onClick={onClick} className={`pm-filter ${active ? "is-on" : ""}`}>
      {dot && <span className={`pm-statusdot pm-statusdot--${dot}`} />}
      <span>{label}</span>
      {count !== undefined && <span className="pm-filter-count">{count}</span>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// SingleAddModal — 한 명씩 사전 등록 (시안 pm-modal 패턴)
// ─────────────────────────────────────────────────────────────
function SingleAddModal({
  open,
  onClose,
  name,
  phone,
  onNameChange,
  onPhoneChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  phone: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="pm-modal-scrim" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
        <header className="pm-modal-head">
          <div className="pm-modal-steps">
            <span className="pm-mstep is-on" style={{ width: "100%" }} />
          </div>
          <button
            type="button"
            className="pm-welcome-close"
            onClick={onClose}
            aria-label="닫기"
            style={{ position: "static" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="pm-chip" style={{ marginTop: 2 }}>
          <span className="pm-chip-dot" />
          <span>한 명씩 등록</span>
        </div>
        <h2 className="pm-modal-h">한 명씩 추가하기</h2>
        <p className="pm-sub">
          아직 가입하지 않은 팀원을 미리 등록해두세요. 나중에 카카오로 가입하면 자동으로 연동돼요.
        </p>

        <div className="pm-field">
          <div className="pm-label">
            <span>이름</span>
            <span className="pm-pill pm-pill--req">필수</span>
          </div>
          <input
            className="pm-input"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="실명 또는 닉네임"
            maxLength={20}
          />
        </div>
        <div className="pm-field">
          <div className="pm-label">
            <span>연락처</span>
            <span className="pm-pill pm-pill--opt">선택</span>
          </div>
          <input
            className="pm-input"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="010-0000-0000"
            type="tel"
            inputMode="numeric"
            maxLength={13}
          />
          <p className="pm-help">전화번호를 적어두면 가입 시 자동 연동에 도움이 돼요.</p>
        </div>

        <button
          type="button"
          className="pm-cta"
          onClick={onSubmit}
          disabled={submitting || !name.trim()}
          aria-busy={submitting || undefined}
        >
          {submitting ? (
            <>
              <Loader2 className="inline-block animate-spin" width={16} height={16} aria-hidden />
              {" 등록 중…"}
            </>
          ) : (
            <>
              등록하기
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <path
                  d="M3 8 L13 8 M9 4 L13 8 L9 12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>,
    document.body,
  );
}
