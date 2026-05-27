"use client";

import "./onboarding.css";
import { motion, useReducedMotion, type Easing } from "framer-motion";
import { useState, useMemo, type CSSProperties, type ReactNode } from "react";
import { completeOnboarding } from "@/app/onboarding/actions";
import { SubmitButton } from "@/components/ui/submit-button";

const EASE: Easing = [0.16, 1, 0.3, 1];

type Props = {
  isFutsal: boolean;
  inviteCode?: string;
  errorMsg?: string;
  isDesignPreview: boolean;
};

type Hue = "gk" | "def" | "mid" | "atk";

function Reveal({
  children,
  delay = 0,
  as = "div",
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  as?: "div" | "header" | "p" | "h1";
  className?: string;
  style?: CSSProperties;
}) {
  const reduced = useReducedMotion();
  const MotionTag =
    as === "header"
      ? motion.header
      : as === "p"
      ? motion.p
      : as === "h1"
      ? motion.h1
      : motion.div;
  return (
    <MotionTag
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 0.7, ease: EASE, delay: delay / 1000 }
      }
      className={className}
      style={style}
    >
      {children}
    </MotionTag>
  );
}

function StepProgress({ current }: { current: 1 | 2 | 3 }) {
  const labels = ["프로필 입력", "팀 선택", "시작!"];
  return (
    <div className="pm-progress-row">
      {labels.map((label, i) => {
        const idx = i + 1;
        const state = idx < current ? "done" : idx === current ? "current" : "upcoming";
        return (
          <div key={i} className={`pm-step pm-step--${state}`}>
            <div className="pm-step-bar" />
            <div className="pm-step-meta">
              <span className="pm-step-num">{String(idx).padStart(2, "0")}</span>
              <span className="pm-step-label">{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldLabel({
  children,
  optional,
  required,
}: {
  children: ReactNode;
  optional?: boolean;
  required?: boolean;
}) {
  return (
    <div className="pm-label">
      <span>{children}</span>
      {required && <span className="pm-pill pm-pill--req">필수</span>}
      {optional && <span className="pm-pill pm-pill--opt">선택</span>}
    </div>
  );
}

function SelectShell({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: ReactNode;
}) {
  return (
    <div className="pm-select">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled hidden>
          {placeholder}
        </option>
        {children}
      </select>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <path
          d="M3 4.5 L6 8 L9 4.5"
          stroke="currentColor"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function BirthDateField({ name }: { name: string }) {
  const [y, setY] = useState("");
  const [m, setM] = useState("");
  const [d, setD] = useState("");
  const value = y && m && d ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : "";
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const arr: number[] = [];
    for (let i = now - 18; i >= now - 80; i--) arr.push(i);
    return arr;
  }, []);
  return (
    <div className="pm-bdate">
      <div className="pm-bdate-row">
        <SelectShell value={y} onChange={setY} placeholder="연도">
          {years.map((yr) => (
            <option key={yr} value={yr}>
              {yr}
            </option>
          ))}
        </SelectShell>
        <SelectShell value={m} onChange={setM} placeholder="월">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}월
            </option>
          ))}
        </SelectShell>
        <SelectShell value={d} onChange={setD} placeholder="일">
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}일
            </option>
          ))}
        </SelectShell>
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

function FootField({ name }: { name: string }) {
  const [val, setVal] = useState("");
  const opts = [
    { v: "RIGHT", label: "오른발" },
    { v: "LEFT", label: "왼발" },
    { v: "BOTH", label: "양발" },
  ];
  return (
    <div className="pm-seg" role="radiogroup" aria-label="주발">
      {opts.map((o) => (
        <button
          type="button"
          key={o.v}
          role="radio"
          aria-checked={val === o.v}
          className={`pm-seg-opt ${val === o.v ? "is-on" : ""}`}
          onClick={() => setVal(val === o.v ? "" : o.v)}
        >
          {o.label}
        </button>
      ))}
      <input type="hidden" name={name} value={val} />
    </div>
  );
}

const FUTSAL_POS: Array<{ code: string; name: string; desc: string; hue: Hue }> = [
  { code: "GK", name: "골키퍼", desc: "골문을 지키는 최후방", hue: "gk" },
  { code: "FIXO", name: "픽소", desc: "수비를 조율하는 후방 플레이어", hue: "def" },
  { code: "ALA", name: "알라", desc: "측면을 오르내리는 윙어", hue: "mid" },
  { code: "PIVO", name: "피보", desc: "최전방에서 마무리하는 타깃", hue: "atk" },
];

const SOCCER_GROUPS: Array<{
  key: Hue;
  label: string;
  items: Array<{ code: string; name: string; desc: string }>;
}> = [
  {
    key: "gk",
    label: "골키퍼",
    items: [{ code: "GK", name: "골키퍼", desc: "골문을 지키는 최후방" }],
  },
  {
    key: "def",
    label: "수비",
    items: [
      { code: "CB", name: "센터백", desc: "중앙 수비의 중심" },
      { code: "LB", name: "레프트백", desc: "왼쪽 측면 수비" },
      { code: "RB", name: "라이트백", desc: "오른쪽 측면 수비" },
    ],
  },
  {
    key: "mid",
    label: "미드필더",
    items: [
      { code: "CDM", name: "수비형 미드", desc: "중원을 지키는 앵커" },
      { code: "CM", name: "중앙 미드", desc: "공·수의 연결 고리" },
      { code: "CAM", name: "공격형 미드", desc: "찬스를 만드는 플레이메이커" },
    ],
  },
  {
    key: "atk",
    label: "공격",
    items: [
      { code: "LW", name: "레프트 윙", desc: "왼쪽 측면 공격수" },
      { code: "RW", name: "라이트 윙", desc: "오른쪽 측면 공격수" },
      { code: "ST", name: "스트라이커", desc: "최전방 골잡이" },
    ],
  },
];

function PositionChip({
  code,
  name,
  desc,
  hue,
  checked,
  onToggle,
}: {
  code: string;
  name: string;
  desc: string;
  hue: Hue;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className={`pm-pos pm-hue--${hue} ${checked ? "is-on" : ""}`}>
      <input
        type="checkbox"
        name="preferredPositions"
        value={code}
        checked={checked}
        onChange={onToggle}
      />
      <div className="pm-pos-code">{code}</div>
      <div className="pm-pos-body">
        <div className="pm-pos-name">{name}</div>
        <div className="pm-pos-desc">{desc}</div>
      </div>
      <div className="pm-pos-check" aria-hidden>
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path
            d="M2.5 6.5 L5 9 L9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </label>
  );
}

function PositionGroup({
  hue,
  label,
  items,
  value,
  onToggle,
  defaultOpen = false,
}: {
  hue: Hue;
  label: string;
  items: Array<{ code: string; name: string; desc: string }>;
  value: string[];
  onToggle: (code: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const count = items.filter((it) => value.includes(it.code)).length;
  return (
    <div className={`pm-group pm-hue--${hue} ${open ? "is-open" : ""}`}>
      <button type="button" className="pm-group-head" onClick={() => setOpen((o) => !o)}>
        <span className="pm-group-dot" />
        <span className="pm-group-label">{label}</span>
        <span className="pm-group-meta">
          {count > 0 && <span className="pm-group-count">{count}</span>}
          <svg width="14" height="14" viewBox="0 0 12 12" className="pm-group-caret" aria-hidden>
            <path
              d="M3 4.5 L6 8 L9 4.5"
              stroke="currentColor"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      <div className="pm-group-body">
        <div className="pm-group-inner">
          {items.map((it) => (
            <PositionChip
              key={it.code}
              code={it.code}
              name={it.name}
              desc={it.desc}
              hue={hue}
              checked={value.includes(it.code)}
              onToggle={() => onToggle(it.code)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Positions({ isFutsal }: { isFutsal: boolean }) {
  const [value, setValue] = useState<string[]>([]);
  const toggle = (code: string) =>
    setValue((v) => (v.includes(code) ? v.filter((c) => c !== code) : [...v, code]));
  if (isFutsal) {
    return (
      <div className="pm-futsal-grid">
        {FUTSAL_POS.map((p) => (
          <PositionChip
            key={p.code}
            code={p.code}
            name={p.name}
            desc={p.desc}
            hue={p.hue}
            checked={value.includes(p.code)}
            onToggle={() => toggle(p.code)}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="pm-soccer-groups">
      {SOCCER_GROUPS.map((g) => (
        <PositionGroup
          key={g.key}
          hue={g.key}
          label={g.label}
          items={g.items}
          value={value}
          onToggle={toggle}
          defaultOpen
        />
      ))}
    </div>
  );
}

export default function OnboardingClient({
  isFutsal,
  inviteCode,
  errorMsg,
  isDesignPreview,
}: Props) {
  return (
    <div className="pm-page">
      <div className="pm-amb" aria-hidden />
      <div className="pm-amb pm-amb--2" aria-hidden />

      <main className="pm-main">
        <Reveal as="header" className="pm-progress-wrap">
          <StepProgress current={1} />
        </Reveal>

        <Reveal delay={80}>
          <div className="pm-chip">
            <span className="pm-chip-dot" />
            <span>1단계 · 환영</span>
          </div>
        </Reveal>

        <Reveal delay={140} as="h1" className="pm-h1">
          반가워요.
          <br />
          가볍게 시작해 볼까요?
        </Reveal>

        <Reveal delay={200} as="p" className="pm-sub">
          이름만 알려주시면 충분해요. 나머지는 비워둬도 괜찮고,
          <br />
          나중에 설정에서 언제든 바꿀 수 있어요.
        </Reveal>

        {isDesignPreview && (
          <div className="pm-notice pm-notice--warn">
            ⚠️ 디자인 미리보기 모드 — 제출 비활성화됨. 본인 프로필 덮어쓰기 방지용.
          </div>
        )}

        {errorMsg && (
          <div className="pm-notice pm-notice--err">{decodeURIComponent(errorMsg)}</div>
        )}

        <form action={completeOnboarding} className="pm-form">
          {inviteCode && <input type="hidden" name="inviteCode" value={inviteCode} />}

          <Reveal delay={260} className="pm-card">
            <div className="pm-card-head">
              <div className="pm-card-chip">기본 정보</div>
              <div className="pm-card-title">기본 프로필</div>
            </div>

            <div className="pm-field">
              <FieldLabel required>이름</FieldLabel>
              <input
                className="pm-input"
                name="name"
                type="text"
                placeholder="예: 김선휘"
                autoComplete="name"
                required
                maxLength={20}
              />
              <p className="pm-help">팀원·운영진에게 실명으로 보여요. 회비·MVP 기록이 헷갈리지 않으려면 실명을 권장해요.</p>
            </div>

            <div className="pm-field">
              <FieldLabel optional>생년월일</FieldLabel>
              <BirthDateField name="birthDate" />
              <p className="pm-help">생일 당일 팀원들에게 축하 알림이 자동으로 전송돼요.</p>
            </div>

            <div className="pm-field">
              <FieldLabel optional>연락처</FieldLabel>
              <input
                className="pm-input"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="010-0000-0000"
                maxLength={13}
              />
              <p className="pm-help">운영진이 일정·회비 관련해 연락할 때 사용해요. 다른 팀원에게는 공개되지 않아요.</p>
            </div>

            <div className="pm-field">
              <FieldLabel optional>주발</FieldLabel>
              <FootField name="preferredFoot" />
            </div>
          </Reveal>

          <Reveal delay={320} className="pm-card">
            <div className="pm-card-head">
              <div className="pm-card-chip">포지션</div>
              <div className="pm-card-title">
                선호 포지션
                <span className="pm-card-mode">{isFutsal ? "풋살" : "축구"}</span>
              </div>
              <div className="pm-card-hint">
                {isFutsal
                  ? "복수 선택 가능 · 비워둬도 괜찮아요"
                  : "그룹을 펼쳐 선택하세요 · 비워둬도 괜찮아요"}
              </div>
            </div>
            <Positions isFutsal={isFutsal} />
          </Reveal>

          <Reveal delay={380} className="pm-cta-wrap">
            <SubmitButton className="pm-cta" disabled={isDesignPreview} pendingText="저장 중...">
              {isDesignPreview ? "미리보기 모드 (제출 비활성화)" : "다음 단계로"}
              {!isDesignPreview && (
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
              )}
            </SubmitButton>
            <p className="pm-cta-sub">다음 단계에서 팀에 합류하거나 새로 만들 수 있어요.</p>
          </Reveal>
        </form>
      </main>
    </div>
  );
}
