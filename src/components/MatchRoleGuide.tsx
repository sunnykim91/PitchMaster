"use client";

/**
 * 경기 역할 가이드 — 쿼터별 내 포지션이 뭐인지, 어떻게 뛰어야 하는지
 *
 * 노출 규칙:
 * - 축구 11인제만 지원 (풋살·8/9/10인제는 조용히 숨김)
 * - 운영진(PRESIDENT/STAFF): 본인 기본 + 드롭다운으로 다른 선수 전환 가능 (용병 제외)
 * - 일반 회원(MEMBER): 본인 역할만. 전술판 미작성이면 숨김
 * - 본인 불참: "이 경기엔 불참하셨습니다" 표시 (회원 기준)
 * - 운영진 + 전술판 미작성: 기본 포메이션 기준 전체 포지션 조회 가능
 */

import { memo, useEffect, useMemo, useState } from "react";
import { ChevronDown, UserRound, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildAssignmentGroups,
  formatQuarterRangeLabel,
  getAllRolesForFormation,
  type AssignmentGroup,
  type MatchSquadRow,
} from "@/lib/positionRoles/playerAssignments";
import type { CautionItem, LinkageItem, MergedPositionRole } from "@/lib/positionRoles/types";
import type { SportType } from "@/lib/types";

type RosterEntry = { id: string; name: string; userId?: string; memberId?: string };

export interface MatchRoleGuideProps {
  matchId: string;
  canManage: boolean;
  /** NextAuth session.user.id (users.id) */
  currentUserId: string;
  /** team_members.id — 없으면 undefined (팀 탈퇴 등) */
  currentMemberId?: string;
  /** 본인 참석 여부 */
  currentMemberAttended: boolean;
  /** 참석자 (용병 포함 가능) */
  attendingPlayers: RosterEntry[];
  /** 용병 id 제외용 */
  guests: { id: string }[];
  defaultFormationId?: string;
  sportType: SportType;
  /** 축구 필드 인원 수 (GK 포함 11 / 10 / 9 / 8). 11이 아니면 가이드 미제공. */
  playerCount?: number;
}

/** 가이드 지원 여부 판단 — 축구 11인제 + 풋살 5인제 */
function isSupported(sportType: SportType, playerCount?: number): boolean {
  if (sportType === "SOCCER") {
    return playerCount == null || playerCount === 11;
  }
  if (sportType === "FUTSAL") {
    return playerCount == null || playerCount === 5;
  }
  return false;
}

export const MatchRoleGuide = memo(function MatchRoleGuide(
  props: MatchRoleGuideProps
) {
  const {
    matchId,
    canManage,
    currentUserId,
    currentMemberId,
    currentMemberAttended,
    attendingPlayers,
    guests,
    defaultFormationId,
    sportType,
    playerCount,
  } = props;

  // 훅은 반드시 early return 위에 위치 (rules-of-hooks)
  const [squads, setSquads] = useState<MatchSquadRow[] | null>(null);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const defaultSelectedId = currentMemberId ?? currentUserId;
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(defaultSelectedId);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(false);
    fetch(`/api/squads?matchId=${encodeURIComponent(matchId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fetch_failed"))))
      .then((d) => {
        if (cancelled) return;
        setSquads(Array.isArray(d?.squads) ? d.squads : []);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setSquads([]);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId, reloadToken]);

  // 전술판에서 포메이션·배치가 저장될 때마다 역할 가이드도 갱신
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ matchId?: string }>).detail;
      if (!detail || detail.matchId === matchId) {
        setReloadToken((v) => v + 1);
      }
    };
    window.addEventListener("match-squads-saved", handler);
    return () => window.removeEventListener("match-squads-saved", handler);
  }, [matchId]);

  // 드롭다운 대상 — 용병 제외
  const memberRoster = useMemo(() => {
    const guestIds = new Set(guests.map((g) => g.id));
    return attendingPlayers.filter((p) => !guestIds.has(p.id));
  }, [attendingPlayers, guests]);

  // 풋살·8/9/10인제는 아예 렌더하지 않음 (훅 호출 후 early return)
  if (!isSupported(sportType, playerCount)) return null;

  // 일반 회원 + 불참 → 메시지
  if (!canManage && !currentMemberAttended) {
    return (
      <SectionFrame>
        <EmptyMessage
          title="이 경기엔 불참하셨습니다"
          hint="참석한 경기에서 본인 역할 가이드를 볼 수 있어요."
        />
      </SectionFrame>
    );
  }

  if (squads === null) {
    return (
      <SectionFrame>
        <Skeleton className="h-24 w-full rounded-xl" />
      </SectionFrame>
    );
  }

  const squadsEmpty = squads.length === 0;

  if (!canManage && squadsEmpty) return null;

  if (canManage && squadsEmpty) {
    return (
      <SectionFrame>
        <FormationOnlyFallback formationId={defaultFormationId} />
      </SectionFrame>
    );
  }

  // squad의 playerId는 users.id / team_members.id 중 어느 쪽이든 저장될 수 있으므로
  // 매칭되는 RosterEntry의 양쪽 id를 모두 targetIds에 넣어 어느 쪽이든 매칭되게 한다.
  const targetIds: string[] = [selectedPlayerId];
  if (selectedPlayerId === currentMemberId && currentUserId) {
    targetIds.push(currentUserId);
  } else if (selectedPlayerId === currentUserId && currentMemberId) {
    targetIds.push(currentMemberId);
  }
  const selectedEntry = memberRoster.find((p) => p.id === selectedPlayerId);
  if (selectedEntry?.userId && !targetIds.includes(selectedEntry.userId)) {
    targetIds.push(selectedEntry.userId);
  }
  if (selectedEntry?.memberId && !targetIds.includes(selectedEntry.memberId)) {
    targetIds.push(selectedEntry.memberId);
  }

  const groups = buildAssignmentGroups(squads, targetIds);
  const selectedName = findSelectedName(selectedPlayerId, memberRoster, currentMemberId, currentUserId);

  return (
    <SectionFrame>
      {canManage && memberRoster.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
          <NativeSelect
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            className="h-9 flex-1 text-sm"
            aria-label="선수 선택"
          >
            <StaffSelectOptions
              defaultId={defaultSelectedId}
              isSelfMember={!!currentMemberId}
              currentMemberId={currentMemberId}
              currentUserId={currentUserId}
              memberRoster={memberRoster}
            />
          </NativeSelect>
        </div>
      )}

      {error && (
        <p className="mb-2 text-xs text-[hsl(var(--warning))]">
          전술 데이터를 불러오지 못했습니다. 새로고침 해보세요.
        </p>
      )}

      {groups.length === 0 ? (
        <EmptyMessage
          title={`${selectedName ?? "선수"}는 이 경기 전술판에 배치 기록이 없어요.`}
          hint="경기 후 전술판에 배치된 선수만 쿼터별 역할이 표시돼요."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((g, i) => (
            <RoleCard
              key={`${g.formationId}-${g.role}-${g.quarters.join(",")}-${i}`}
              group={g}
            />
          ))}
        </div>
      )}
    </SectionFrame>
  );
});

/* ────────────────────────────── 섹션 프레임 ────────────────────────────── */

function SectionFrame({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-xl border border-border/30 bg-card/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <div>
          <h3 className="text-base font-bold leading-tight">역할 가이드</h3>
          <p className="text-[11px] text-muted-foreground">
            쿼터별 내 포지션의 역할과 주의점을 확인하세요.
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyMessage({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/30 bg-background/30 p-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StaffSelectOptions({
  defaultId,
  isSelfMember,
  currentMemberId,
  currentUserId,
  memberRoster,
}: {
  defaultId: string;
  isSelfMember: boolean;
  currentMemberId?: string;
  currentUserId: string;
  memberRoster: RosterEntry[];
}) {
  const selfEntry = memberRoster.find(
    (p) => p.id === currentMemberId || p.id === currentUserId
  );
  const others = memberRoster.filter(
    (p) => p.id !== currentMemberId && p.id !== currentUserId
  );
  others.sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return (
    <>
      {selfEntry ? (
        <option value={selfEntry.id}>{selfEntry.name} (나)</option>
      ) : (
        isSelfMember && (
          <option value={defaultId} disabled>
            (본인 불참)
          </option>
        )
      )}
      {others.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </>
  );
}

function findSelectedName(
  selectedId: string,
  roster: RosterEntry[],
  currentMemberId: string | undefined,
  currentUserId: string
): string | null {
  if (selectedId === currentMemberId || selectedId === currentUserId) return "나";
  return roster.find((p) => p.id === selectedId)?.name ?? null;
}

/* ────────────────────────────── 역할 카드 (쿼터 기반) ────────────────────────────── */

function RoleCard({ group }: { group: AssignmentGroup }) {
  const [open, setOpen] = useState(false);
  const { mergedRole } = group;
  const quarterLabel = formatQuarterRangeLabel(group.quarters);

  if (!mergedRole) {
    return (
      <div className="rounded-xl bg-secondary/30 p-3 text-sm">
        <div className="flex items-center gap-2">
          <QuarterBadge label={quarterLabel} />
          <span className="font-medium">{group.role}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          이 포메이션의 역할 가이드는 준비 중입니다.
        </p>
      </div>
    );
  }

  return (
    <AccordionCard
      open={open}
      onToggle={() => setOpen((v) => !v)}
      header={
        <div className="flex flex-1 items-center gap-2.5 min-w-0">
          <QuarterBadge label={quarterLabel} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{mergedRole.title}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {mergedRole.summary}
            </p>
          </div>
        </div>
      }
    >
      <RoleDetail role={mergedRole} />
    </AccordionCard>
  );
}

/* ────────────────────────────── 공통 아코디언 쉘 ────────────────────────────── */

function AccordionCard({
  open,
  onToggle,
  header,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-secondary/30 transition-colors",
        open && "bg-secondary/40"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 p-3.5 text-left hover:bg-secondary/50 transition-colors"
        aria-expanded={open}
      >
        {header}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="border-t border-border/20 bg-background/40 p-4">
          {children}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────── 역할 상세 콘텐츠 ────────────────────────────── */

function RoleDetail({ role }: { role: MergedPositionRole }) {
  return (
    <div className="space-y-5 text-sm leading-relaxed">
      <Block label="왜 이 자리가 중요한가">
        <MarkdownLite text={role.whyItMatters} />
      </Block>
      <BulletBlock label="공격 시" items={role.attack} />
      <BulletBlock label="수비 시" items={role.defense} />
      <BulletBlock label="커뮤니케이션" items={role.communication} />
      <BulletBlock label="체력 관리" items={role.stamina} />
      <CautionList items={role.caution} />
      <LinkageList items={role.linkage} />
    </div>
  );
}

function QuarterBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
      {label}
    </span>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold text-foreground/60">{label}</p>
      <div className="text-[13.5px] text-foreground/90">{children}</div>
    </div>
  );
}

function BulletBlock({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold text-foreground/60">{label}</p>
      <ul className="space-y-1.5 text-[13.5px] text-foreground/90">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span className="flex-1">
              <MarkdownLite text={t} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CautionList({ items }: { items: CautionItem[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-[hsl(var(--warning))]">
        <AlertTriangle className="h-3 w-3" />
        조심할 실수
      </p>
      <ul className="space-y-1.5">
        {items.map((c, i) => (
          <li
            key={i}
            className="rounded-lg border-l-2 border-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.06)] p-3 pl-3"
          >
            <p className="text-[13px] font-medium">{c.title}</p>
            <p className="mt-1 text-[12px] text-foreground/70">
              <MarkdownLite text={c.detail} />
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LinkageList({ items }: { items: LinkageItem[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold text-foreground/60">
        동료와의 연계
      </p>
      <ul className="space-y-1.5">
        {items.map((l, i) => (
          <li key={i} className="rounded-lg bg-secondary/40 p-3">
            <p className="text-[13px] font-medium">{l.position}</p>
            <p className="mt-0.5 text-[12px] text-foreground/70">
              <MarkdownLite text={l.note} />
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 초경량 인라인 강조 파서 — `**...**` 를 <strong> 으로만 변환.
 */
function MarkdownLite({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {p.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

/* ───────────────── 운영진 + 전술판 미작성 폴백 ───────────────── */

function FormationOnlyFallback({ formationId }: { formationId?: string }) {
  const roles = useMemo(
    () => (formationId ? getAllRolesForFormation(formationId) : []),
    [formationId]
  );

  if (!formationId || roles.length === 0) {
    return (
      <EmptyMessage
        title="전술판이 아직 작성되지 않았어요."
        hint="전술판을 먼저 짜면 쿼터별 역할 가이드를 볼 수 있습니다."
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="mb-2 rounded-lg bg-primary/10 p-3 text-xs text-foreground/80">
        전술판이 비어있어 <strong className="text-foreground">{formationId}</strong> 포메이션 기준
        전체 포지션 가이드를 보여드려요. 쿼터별 정확한 역할은 전술판을 먼저 짠 뒤 확인하세요.
      </p>
      {roles.map((r) => (
        <FormationSlotCard key={r.slotId} role={r.mergedRole} slotCode={r.role} />
      ))}
    </div>
  );
}

function FormationSlotCard({
  role,
  slotCode,
}: {
  role: MergedPositionRole | null;
  slotCode: string;
}) {
  const [open, setOpen] = useState(false);
  if (!role) {
    return (
      <div className="rounded-xl bg-secondary/30 p-3 text-sm">
        <span className="font-medium">{slotCode}</span>
        <span className="ml-2 text-xs text-muted-foreground">가이드 준비 중</span>
      </div>
    );
  }
  return (
    <AccordionCard
      open={open}
      onToggle={() => setOpen((v) => !v)}
      header={
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{role.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">{role.summary}</p>
        </div>
      }
    >
      <RoleDetail role={role} />
    </AccordionCard>
  );
}
