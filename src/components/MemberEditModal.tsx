"use client";

/**
 * MemberEditModal v2 — 시안 5-section sheet (회원 편집 모달)
 *
 * 섹션 (권한별 노출):
 *  1. 등번호           — isSelf || isStaffOrAbove
 *  2. 감독 지정 포지션 — isStaffOrAbove
 *  3. 주장·부주장      — isStaffOrAbove (선택 즉시 저장)
 *  4. 역할 변경        — canChangeRole && !isSelf (warning confirm)
 *  5. 휴면 처리/해제   — canChangeRole && !isSelf
 *
 * Footer: 회원 제명 — canKick && !isSelf (destructive, 2-tap confirm)
 *
 * 시안: landing/member-edit-modal.jsx + landing/styles.css 그대로 이식.
 * 핸들러 시그니처는 기존 V1 유지 (부모 MembersClient의 apiMutate 흐름 보존).
 */

import "@/app/onboarding/onboarding.css";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Role } from "@/lib/types";
import { formatPhone } from "@/lib/utils";

interface MemberLite {
  id: string;
  name: string;
  role: Role;
  status: string;
  jerseyNumber: number | null;
  coachPositions: string[];
  teamRole: string | null;
  dormantType: string | null;
  dormantUntil: string | null;
  dormantReason: string | null;
  phone?: string;
  birthDate?: string;
  profileImageUrl?: string | null;
  isLinked?: boolean;
}

export type SignupCandidate = {
  userId: string;
  name: string;
  phone: string;
};

export interface MemberEditModalProps {
  open: boolean;
  onClose: () => void;
  member: MemberLite | null;
  positions: string[]; // 현재 사용 안 함 (sport prop으로 분기). 호환 유지
  sport?: "SOCCER" | "FUTSAL";
  // 권한 플래그
  isSelf: boolean;
  isStaffOrAbove: boolean;
  canChangeRole: boolean;
  canKick: boolean;
  // 핸들러 (저장 시 부모가 apiMutate + refetch 처리)
  onSaveJersey: (memberId: string, value: number | null) => Promise<void>;
  onSaveCoachPositions: (memberId: string, positions: string[]) => Promise<void>;
  onTeamRoleChange: (memberId: string, role: string | null) => Promise<void>;
  onRoleChange: (memberId: string, role: Role) => Promise<void>;
  onSetDormant: (memberId: string, type: string, until: string, reason: string) => Promise<void>;
  onUnsetDormant: (memberId: string) => Promise<void>;
  onKick?: (memberId: string) => Promise<void>;
  // 계정 연결 (미가입 회원 → 카카오 가입자 user_id 매칭). PRESIDENT만
  signupPool?: SignupCandidate[];
  onLink?: (memberId: string, userId: string) => Promise<void>;
}

const ROLE_META: Record<Role, { label: string; hue: "atk" | "def" | "neutral" }> = {
  PRESIDENT: { label: "회장", hue: "atk" },
  STAFF: { label: "운영진", hue: "def" },
  MEMBER: { label: "회원", hue: "neutral" },
};

const DORMANT_REASONS = [
  { value: "INJURED", label: "부상", emoji: "🏥" },
  { value: "PERSONAL", label: "개인사정", emoji: "✈️" },
  { value: "OTHER", label: "기타", emoji: "❓" },
] as const;

const SOCCER_POS_GROUPS = [
  { label: "골키퍼", hue: "gk" as const, items: [{ code: "GK", name: "골키퍼" }] },
  {
    label: "수비",
    hue: "def" as const,
    items: [
      { code: "CB", name: "센터백" },
      { code: "LB", name: "레프트백" },
      { code: "RB", name: "라이트백" },
    ],
  },
  {
    label: "미드",
    hue: "mid" as const,
    items: [
      { code: "CDM", name: "수비형" },
      { code: "CM", name: "중앙" },
      { code: "CAM", name: "공격형" },
    ],
  },
  {
    label: "공격",
    hue: "atk" as const,
    items: [
      { code: "LW", name: "레프트 윙" },
      { code: "RW", name: "라이트 윙" },
      { code: "ST", name: "스트라이커" },
    ],
  },
];

const FUTSAL_POS_GROUPS = [
  { label: "골키퍼", hue: "gk" as const, items: [{ code: "GK", name: "골키퍼" }] },
  { label: "수비", hue: "def" as const, items: [{ code: "FIXO", name: "픽소" }] },
  { label: "미드", hue: "mid" as const, items: [{ code: "ALA", name: "알라" }] },
  { label: "공격", hue: "atk" as const, items: [{ code: "PIVO", name: "피보" }] },
];

// ─────────────────────────────────────────────────────────────
// EditSection wrapper
// ─────────────────────────────────────────────────────────────
function EditSection({
  num,
  label,
  sub,
  children,
  dirty,
  onSave,
}: {
  num: number;
  label: string;
  sub?: string;
  children: ReactNode;
  dirty?: boolean;
  onSave?: () => void;
}) {
  return (
    <section className="pm-edit-section">
      <header className="pm-edit-section-head">
        <div className="pm-edit-section-meta">
          <span className="pm-edit-section-num">{String(num).padStart(2, "0")}</span>
          <span className="pm-edit-section-label">{label}</span>
        </div>
        {dirty && (
          <button type="button" className="pm-edit-save" onClick={onSave}>
            저장
          </button>
        )}
      </header>
      {sub && <p className="pm-edit-section-sub">{sub}</p>}
      <div className="pm-edit-section-body">{children}</div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// 1. Jersey
// ─────────────────────────────────────────────────────────────
function JerseySection({
  num,
  initial,
  onSave,
}: {
  num: number;
  initial: number | null;
  onSave: (v: number | null) => void;
}) {
  const [val, setVal] = useState(initial == null ? "" : String(initial));
  useEffect(() => {
    setVal(initial == null ? "" : String(initial));
  }, [initial]);

  const dirty = (initial == null ? "" : String(initial)) !== val;
  const valid = val === "" || (/^\d{1,3}$/.test(val) && +val >= 1 && +val <= 999);

  // 미저장 변경 시 페이지 이탈 경고
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const save = () => {
    if (!dirty || !valid) return;
    if (val === "") {
      onSave(null);
      return;
    }
    onSave(Number(val));
  };

  return (
    <EditSection
      num={num}
      label="등번호"
      sub="비워두면 미배정 상태로 저장돼요."
      dirty={dirty && valid}
      onSave={save}
    >
      <div className="pm-jersey-row">
        <div className="pm-jersey-input-wrap">
          <input
            className={`pm-input pm-jersey-input ${!valid ? "is-error" : ""}`}
            type="text"
            inputMode="numeric"
            value={val}
            onChange={(e) => setVal(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
            placeholder="-"
            aria-label="등번호"
          />
        </div>
        <div className="pm-jersey-preview">
          <span className="pm-jersey-prev-label">미리보기</span>
          <span className={`pm-jersey-prev-num ${val === "" ? "is-empty" : ""}`}>
            {val === "" ? "미배정" : `#${val}`}
          </span>
        </div>
      </div>
    </EditSection>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. Coach positions (multi)
// ─────────────────────────────────────────────────────────────
function CoachPositionsSection({
  num,
  sport,
  initial,
  onSave,
}: {
  num: number;
  sport: "SOCCER" | "FUTSAL";
  initial: string[];
  onSave: (v: string[]) => void;
}) {
  const groups = sport === "FUTSAL" ? FUTSAL_POS_GROUPS : SOCCER_POS_GROUPS;
  const [picked, setPicked] = useState<string[]>(initial);
  useEffect(() => {
    setPicked(initial);
  }, [initial]);

  const dirty = useMemo(() => {
    const a = [...initial].sort().join(",");
    const b = [...picked].sort().join(",");
    return a !== b;
  }, [initial, picked]);

  // 미저장 변경 시 페이지 이탈 경고
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const toggle = (code: string) =>
    setPicked((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));

  return (
    <EditSection
      num={num}
      label="감독 지정 포지션"
      sub="라인업·교체 추천에 반영돼요. 복수 선택 가능."
      dirty={dirty}
      onSave={() => onSave(picked)}
    >
      <div className="pm-coach-groups">
        {groups.map((g) => (
          <div key={g.label} className={`pm-coach-group pm-hue--${g.hue}`}>
            <div className="pm-coach-group-label">
              <span className="pm-coach-group-dot" />
              {g.label}
            </div>
            <div className="pm-coach-row">
              {g.items.map((it) => {
                const on = picked.includes(it.code);
                return (
                  <button
                    key={it.code}
                    type="button"
                    className={`pm-coach-chip ${on ? "is-on" : ""}`}
                    onClick={() => toggle(it.code)}
                  >
                    <span className="pm-coach-code">{it.code}</span>
                    <span className="pm-coach-name">{it.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </EditSection>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. Team role — instant save
// ─────────────────────────────────────────────────────────────
function TeamRoleSection({
  num,
  value,
  onChange,
}: {
  num: number;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const opts: Array<{ v: string | null; label: string; variant?: string }> = [
    { v: null, label: "일반 회원" },
    { v: "CAPTAIN", label: "주장", variant: "success" },
    { v: "VICE_CAPTAIN", label: "부주장", variant: "info" },
  ];
  return (
    <EditSection
      num={num}
      label="주장·부주장"
      sub="선택 즉시 저장돼요. 선출은 한 명씩만 가능해요."
    >
      <div className="pm-statuspill-row" role="radiogroup" aria-label="팀 역할">
        {opts.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            className={`pm-statuspill ${o.variant ? `pm-statuspill--${o.variant}` : ""} ${value === o.v ? "is-on" : ""}`}
            onClick={() => onChange(o.v)}
          >
            {o.v === "CAPTAIN" && <span className="pm-statusdot pm-statusdot--success" />}
            {o.v === "VICE_CAPTAIN" && <span className="pm-statusdot pm-statusdot--info" />}
            {o.label}
          </button>
        ))}
      </div>
    </EditSection>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. Role change — inline confirm for destructive transitions
// ─────────────────────────────────────────────────────────────
function RoleChangeSection({
  num,
  value,
  onChange,
}: {
  num: number;
  value: Role;
  onChange: (v: Role) => void;
}) {
  const [pending, setPending] = useState<Role | null>(null);
  const opts: Array<{ v: Role; label: string; hue: "atk" | "def" | "neutral"; warning: string | null }> = [
    {
      v: "PRESIDENT",
      label: "회장",
      hue: "atk",
      warning: "이임 후 본인은 자동으로 운영진(STAFF)으로 변경됩니다.",
    },
    { v: "STAFF", label: "운영진", hue: "def", warning: null },
    { v: "MEMBER", label: "회원", hue: "neutral", warning: "운영진 권한이 모두 사라집니다." },
  ];
  const pendingOpt = opts.find((o) => o.v === pending);

  return (
    <EditSection num={num} label="역할 변경">
      <div className="pm-role-row" role="radiogroup" aria-label="회원 역할">
        {opts.map((o) => {
          const on = value === o.v;
          return (
            <button
              key={o.v}
              type="button"
              className={`pm-role-card pm-hue--${o.hue} ${on ? "is-on" : ""}`}
              onClick={() => {
                if (on) return;
                if (o.warning) setPending(o.v);
                else onChange(o.v);
              }}
            >
              <div className="pm-role-card-label">{o.label}</div>
              <div className="pm-role-card-radio">
                <span />
              </div>
            </button>
          );
        })}
      </div>
      {pendingOpt && (
        <div className="pm-confirm">
          <div className="pm-confirm-body">
            <div className="pm-confirm-title">
              <strong>{pendingOpt.label}</strong>(으)로 변경하시겠어요?
            </div>
            <div className="pm-confirm-sub">{pendingOpt.warning}</div>
          </div>
          <div className="pm-confirm-actions">
            <button type="button" className="pm-confirm-cancel" onClick={() => setPending(null)}>
              취소
            </button>
            <button
              type="button"
              className="pm-confirm-ok"
              onClick={() => {
                onChange(pendingOpt.v);
                setPending(null);
              }}
            >
              {pendingOpt.label}(으)로 변경
            </button>
          </div>
        </div>
      )}
    </EditSection>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. Dormant
// ─────────────────────────────────────────────────────────────
function DormantSection({
  num,
  isDormant,
  dormantInfo,
  onSet,
  onUnset,
}: {
  num: number;
  isDormant: boolean;
  dormantInfo: { type: string | null; until: string | null; reason: string | null };
  onSet: (payload: { type: string; until: string; reason: string }) => void;
  onUnset: () => void;
}) {
  const [type, setType] = useState<string>("INJURED");
  const [until, setUntil] = useState("");
  const [memo, setMemo] = useState("");
  const [expanded, setExpanded] = useState(false);

  if (isDormant) {
    const r = DORMANT_REASONS.find((r) => r.value === dormantInfo.type);
    return (
      <EditSection num={num} label="휴면 상태">
        <div className="pm-dormant-info">
          <div className="pm-dormant-row">
            <span className="pm-dormant-row-label">사유</span>
            <span className="pm-dormant-row-val">
              {r?.emoji} {r?.label || dormantInfo.type || "(미지정)"}
            </span>
          </div>
          {dormantInfo.until && (
            <div className="pm-dormant-row">
              <span className="pm-dormant-row-label">예정 종료</span>
              <span className="pm-dormant-row-val">{dormantInfo.until}</span>
            </div>
          )}
          {dormantInfo.reason && (
            <div className="pm-dormant-row pm-dormant-row--memo">
              <span className="pm-dormant-row-label">메모</span>
              <span className="pm-dormant-row-val">{dormantInfo.reason}</span>
            </div>
          )}
        </div>
        <button type="button" className="pm-cta pm-cta--soft" onClick={onUnset}>
          활동 회원으로 복귀
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path
              d="M3 7h8M8 4l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </EditSection>
    );
  }

  const submit = () => onSet({ type, until, reason: memo });

  // 활성 회원: 기본 접힘. "휴면 처리하기" 버튼만 노출
  if (!expanded) {
    return (
      <EditSection num={num} label="휴면 처리">
        <button
          type="button"
          className="pm-paste-secondary"
          onClick={() => setExpanded(true)}
          style={{ width: "100%" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          이 회원을 휴면으로 처리하기
        </button>
      </EditSection>
    );
  }

  return (
    <EditSection
      num={num}
      label="휴면 처리"
      sub="회원이 활동을 잠시 쉴 때 사용해요. 사유와 종료 예정일을 함께 남겨주세요."
    >
      <div className="pm-field">
        <div className="pm-edit-sub-label">사유</div>
        <div className="pm-dormant-reasons">
          {DORMANT_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`pm-dormant-reason ${type === r.value ? "is-on" : ""}`}
              onClick={() => setType(r.value)}
            >
              <span className="pm-dormant-emoji" aria-hidden>
                {r.emoji}
              </span>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pm-field">
        <div className="pm-edit-sub-label">
          종료 예정일 <span className="pm-pill pm-pill--opt">선택</span>
        </div>
        <input
          type="date"
          className="pm-input"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
        />
      </div>

      <div className="pm-field">
        <div className="pm-edit-sub-label">
          메모 <span className="pm-pill pm-pill--opt">선택</span>
        </div>
        <textarea
          className="pm-paste-ta pm-dormant-memo"
          rows={3}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="예: 6주 깁스. 12월 말 복귀 예상"
        />
      </div>

      <button type="button" className="pm-cta" onClick={submit}>
        휴면으로 변경
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
      </button>
    </EditSection>
  );
}

// ─────────────────────────────────────────────────────────────
// Account link — 미가입 회원에 카카오 가입자 user_id 매칭
// ─────────────────────────────────────────────────────────────
function LinkAccountSection({
  num,
  memberName,
  signupPool,
  onLink,
}: {
  num: number;
  memberName: string;
  signupPool: SignupCandidate[];
  onLink: (userId: string) => Promise<void> | void;
}) {
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<SignupCandidate | null>(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return signupPool.slice(0, 5);
    return signupPool.filter(
      (u) => u.name.toLowerCase().includes(needle) || u.phone.includes(needle),
    );
  }, [q, signupPool]);

  return (
    <EditSection
      num={num}
      label="계정 연결"
      sub="이 회원이 PitchMaster에 가입했다면 가입한 계정을 연결할 수 있어요."
    >
      <div className="pm-link-note">
        <span className="pm-link-note-icon" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M5.5 8.5l3-3M4 7l-1 1a2 2 0 0 0 2.8 2.8l1-1M10 7l1-1a2 2 0 0 0-2.8-2.8l-1 1"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span>
          현재 <strong>{memberName}</strong>은(는) 미가입 상태예요. 가입한 계정을 연결하면 본인이
          직접 로그인해 일정을 확인할 수 있어요.
        </span>
      </div>

      <div className="pm-search-wrap">
        <svg width="14" height="14" viewBox="0 0 14 14" className="pm-search-icon" aria-hidden>
          <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" fill="none" />
          <path d="m9 9 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          className="pm-input pm-input--search"
          placeholder="이름이나 전화번호로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="pm-link-results">
        {results.length === 0 ? (
          <div className="pm-empty">검색 결과가 없어요. 다른 이름·전화로 시도해 보세요.</div>
        ) : (
          results.map((u) => (
            <div key={u.userId} className="pm-link-result">
              <div className="pm-result-avatar" aria-hidden>
                {u.name.slice(0, 1)}
              </div>
              <div className="pm-result-body">
                <div className="pm-result-name">{u.name}</div>
                <div className="pm-result-meta">{u.phone}</div>
              </div>
              <button
                type="button"
                className="pm-result-btn"
                onClick={() => setPending(u)}
              >
                연결
              </button>
            </div>
          ))
        )}
      </div>

      {pending && (
        <div className="pm-confirm pm-confirm--destructive">
          <div className="pm-confirm-body">
            <div className="pm-confirm-title">
              <strong>{memberName}</strong>을(를) <strong>{pending.name}</strong> 계정과
              연결할까요?
            </div>
            <div className="pm-confirm-sub">
              연결 후에는 되돌릴 수 없고, 가입자 본인의 출결·회비 기록이 이 회원에게 합쳐집니다.
            </div>
          </div>
          <div className="pm-confirm-actions">
            <button
              type="button"
              className="pm-confirm-cancel"
              onClick={() => setPending(null)}
            >
              취소
            </button>
            <button
              type="button"
              className="pm-confirm-ok pm-confirm-ok--destructive"
              onClick={async () => {
                const u = pending;
                setPending(null);
                await onLink(u.userId);
              }}
            >
              연결하기
            </button>
          </div>
        </div>
      )}
    </EditSection>
  );
}

// ─────────────────────────────────────────────────────────────
// Kick row — 2-tap destructive confirm
// ─────────────────────────────────────────────────────────────
function KickRow({ name, onKick }: { name: string; onKick: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <div className="pm-kick-row">
      {!armed ? (
        <button type="button" className="pm-kick-trigger" onClick={() => setArmed(true)}>
          회원 제명
        </button>
      ) : (
        <div className="pm-confirm pm-confirm--destructive">
          <div className="pm-confirm-body">
            <div className="pm-confirm-title">
              <strong>{name}</strong> 회원을 제명할까요?
            </div>
            <div className="pm-confirm-sub">
              팀에서 즉시 제외되며 출결·회비 기록은 남습니다.
            </div>
          </div>
          <div className="pm-confirm-actions">
            <button type="button" className="pm-confirm-cancel" onClick={() => setArmed(false)}>
              취소
            </button>
            <button
              type="button"
              className="pm-confirm-ok pm-confirm-ok--destructive"
              onClick={onKick}
            >
              제명
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────
export function MemberEditModal({
  open,
  onClose,
  member,
  sport = "SOCCER",
  isSelf,
  isStaffOrAbove,
  canChangeRole,
  canKick,
  onSaveJersey,
  onSaveCoachPositions,
  onTeamRoleChange,
  onRoleChange,
  onSetDormant,
  onUnsetDormant,
  onKick,
  signupPool,
  onLink,
}: MemberEditModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // body scroll lock + ESC
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!mounted || !open || !member) return null;

  const showJersey = isSelf || isStaffOrAbove;
  const showCoach = isStaffOrAbove;
  const showTeamRole = isStaffOrAbove;
  const showRole = canChangeRole && !isSelf;
  const showDormant = canChangeRole && !isSelf;
  const showLink =
    !!onLink && canChangeRole && !isSelf && member.isLinked === false;
  const showKick = !!onKick && canKick && !isSelf;

  const role = member.role || "MEMBER";
  const roleMeta = ROLE_META[role];
  const isDormant = member.status === "DORMANT" || !!member.dormantType;

  // Section numbering based on visibility
  let n = 0;
  const next = () => ++n;

  return createPortal(
    <div className="pm-modal-scrim" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="pm-modal pm-modal--tall pm-modal--edit"
        onClick={(e) => e.stopPropagation()}
      >
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
              <path
                d="M3 3l8 8M11 3l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="pm-edit-head">
          <div className={`pm-mrow-av pm-mrow-av--lg pm-hue--${roleMeta.hue}`} aria-hidden>
            {member.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.profileImageUrl}
                alt=""
                className="pm-mrow-av-img"
                referrerPolicy="no-referrer"
              />
            ) : (
              member.name?.slice(0, 1) || "·"
            )}
          </div>
          <div className="pm-edit-head-body">
            <div className="pm-edit-head-name">
              {member.name}
              {role !== "MEMBER" && (
                <span className={`pm-rolebadge pm-hue--${roleMeta.hue}`}>{roleMeta.label}</span>
              )}
              {member.teamRole === "CAPTAIN" && (
                <span className="pm-rolebadge pm-rolebadge--cap">주장</span>
              )}
              {member.teamRole === "VICE_CAPTAIN" && (
                <span className="pm-rolebadge pm-rolebadge--vice">부주장</span>
              )}
              {member.isLinked === false && (
                <span className="pm-rolebadge pm-rolebadge--unlinked">미가입</span>
              )}
            </div>
            <div className="pm-edit-head-meta">
              {member.phone && <>{formatPhone(member.phone)}</>}
              {member.birthDate && <> · {member.birthDate}</>}
              {member.jerseyNumber != null && <> · #{member.jerseyNumber}</>}
            </div>
            {isDormant && (
              <div className="pm-edit-head-status">
                <span className="pm-statusdot pm-statusdot--muted" />
                휴면 중
                {member.dormantType && (
                  <> · {DORMANT_REASONS.find((r) => r.value === member.dormantType)?.label}</>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pm-edit-divider" />

        {showJersey && (
          <JerseySection
            num={next()}
            initial={member.jerseyNumber}
            onSave={(v) => {
              void onSaveJersey(member.id, v);
            }}
          />
        )}

        {showCoach && (
          <CoachPositionsSection
            num={next()}
            sport={sport}
            initial={member.coachPositions || []}
            onSave={(positions) => {
              void onSaveCoachPositions(member.id, positions);
            }}
          />
        )}

        {showTeamRole && (
          <TeamRoleSection
            num={next()}
            value={member.teamRole}
            onChange={(v) => {
              void onTeamRoleChange(member.id, v);
            }}
          />
        )}

        {showRole && (
          <RoleChangeSection
            num={next()}
            value={role}
            onChange={(v) => {
              void onRoleChange(member.id, v);
            }}
          />
        )}

        {showDormant && (
          <DormantSection
            num={next()}
            isDormant={isDormant}
            dormantInfo={{
              type: member.dormantType,
              until: member.dormantUntil,
              reason: member.dormantReason,
            }}
            onSet={(payload) => {
              void onSetDormant(member.id, payload.type, payload.until, payload.reason);
            }}
            onUnset={() => {
              void onUnsetDormant(member.id);
            }}
          />
        )}

        {showLink && (
          <LinkAccountSection
            num={next()}
            memberName={member.name}
            signupPool={signupPool ?? []}
            onLink={async (userId) => {
              await onLink!(member.id, userId);
              onClose();
            }}
          />
        )}

        {showKick && (
          <KickRow
            name={member.name}
            onKick={async () => {
              await onKick!(member.id);
              onClose();
            }}
          />
        )}

        {!showJersey && !showCoach && !showTeamRole && !showRole && !showDormant && (
          <div className="pm-empty pm-empty--muted">이 회원에 대해 수정할 권한이 없어요.</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
