"use client";

import "@/app/onboarding/onboarding.css";
import { motion, useReducedMotion, type Easing } from "framer-motion";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { createTeam, joinTeam } from "@/app/team/actions";
import { GA } from "@/lib/analytics";
import DemoButton from "@/app/login/DemoButton";

const EASE: Easing = [0.16, 1, 0.3, 1];

type Branch = "invite" | "direct" | "member";
type PathKey = "create" | "invite" | "search";

type Props = {
  hasExistingTeam?: boolean;
  currentTeamName?: string;
};

// ─────────────────────────────────────────────────────────────
// Reveal
// ─────────────────────────────────────────────────────────────
function Reveal({
  children,
  delay = 0,
  as = "div",
  className,
  style,
  keyOverride,
}: {
  children: ReactNode;
  delay?: number;
  as?: "div" | "header" | "p" | "h1";
  className?: string;
  style?: CSSProperties;
  keyOverride?: string;
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
      key={keyOverride}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduced ? { duration: 0 } : { duration: 0.7, ease: EASE, delay: delay / 1000 }
      }
      className={className}
      style={style}
    >
      {children}
    </MotionTag>
  );
}

// ─────────────────────────────────────────────────────────────
// StepProgress
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// PathPicker — 3 path radio cards
// ─────────────────────────────────────────────────────────────
const PATHS: Array<{
  key: PathKey;
  label: string;
  sub: string;
  hue: "atk" | "def" | "mid";
  icon: ReactNode;
}> = [
  {
    key: "create",
    label: "새 팀 만들기",
    sub: "회장으로 시작",
    hue: "atk",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "invite",
    label: "초대 코드로 합류",
    sub: "회장에게 받은 코드",
    hue: "def",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3.5" y="6" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6.5 6V4.5a3.5 3.5 0 1 1 7 0V6" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    key: "search",
    label: "팀 검색해서 신청",
    sub: "회장 승인 후 합류",
    hue: "mid",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="9" cy="9" r="5" stroke="currentColor" strokeWidth="1.6" />
        <path d="m13 13 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

function PathPicker({
  active,
  onChange,
}: {
  active: PathKey;
  onChange: (k: PathKey) => void;
}) {
  return (
    <div className="pm-paths">
      {PATHS.map((p) => (
        <button
          key={p.key}
          type="button"
          className={`pm-path pm-hue--${p.hue} ${active === p.key ? "is-on" : ""}`}
          onClick={() => onChange(p.key)}
        >
          <div className="pm-path-icon">{p.icon}</div>
          <div className="pm-path-body">
            <div className="pm-path-label">{p.label}</div>
            <div className="pm-path-sub">{p.sub}</div>
          </div>
          <div className="pm-path-radio" aria-hidden>
            <span />
          </div>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CreateTeamForm
// ─────────────────────────────────────────────────────────────
type NameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

function NameStatusBadge({ status }: { status: NameStatus }) {
  if (status === "idle" || status === "invalid") return null;
  if (status === "checking") return <span className="pm-input-badge pm-input-badge--checking">확인 중</span>;
  if (status === "available") return <span className="pm-input-badge pm-input-badge--ok">사용 가능</span>;
  if (status === "taken") return <span className="pm-input-badge pm-input-badge--err">이미 사용 중</span>;
  return null;
}

function NameStatusMsg({ status }: { status: NameStatus }) {
  if (status === "taken")
    return <p className="pm-help pm-help--err">다른 이름을 시도해 보세요. 띄어쓰기·이모지·숫자 모두 OK.</p>;
  if (status === "available")
    return <p className="pm-help pm-help--ok">좋아요! 이 이름으로 시작할 수 있어요.</p>;
  if (status === "invalid")
    return <p className="pm-help pm-help--err">2글자 이상 입력해 주세요.</p>;
  return <p className="pm-help">실시간으로 중복을 확인해요.</p>;
}

function SportPick({
  value,
  current,
  onPick,
  label,
  sub,
}: {
  value: "SOCCER" | "FUTSAL";
  current: "SOCCER" | "FUTSAL";
  onPick: (v: "SOCCER" | "FUTSAL") => void;
  label: string;
  sub: string;
}) {
  const on = current === value;
  return (
    <label className={`pm-sport ${on ? "is-on" : ""}`}>
      <input
        type="radio"
        name="sportType"
        value={value}
        checked={on}
        onChange={() => onPick(value)}
      />
      <div className="pm-sport-glyph" aria-hidden>
        {value === "SOCCER" ? (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M11 5l3 2-1 3.5h-4L8 7l3-2zM4 11l3 1 1 3-2 2M18 11l-3 1-1 3 2 2"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
            />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="3" y="6" width="16" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M3 9h16M3 13h16M8 6v11M14 6v11"
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.6"
            />
          </svg>
        )}
      </div>
      <div className="pm-sport-body">
        <div className="pm-sport-label">{label}</div>
        <div className="pm-sport-sub">{sub}</div>
      </div>
    </label>
  );
}

function CreateTeamForm() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<NameStatus>("idle");
  const [sport, setSport] = useState<"SOCCER" | "FUTSAL">("SOCCER");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus("idle");
      return;
    }
    if (trimmed.length < 2) {
      setStatus("invalid");
      return;
    }
    setStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/teams/check-name?name=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setStatus(data.available ? "available" : "taken");
      } catch {
        setStatus("idle");
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name]);

  const submitDisabled = status === "taken" || status === "checking" || status === "idle" || status === "invalid";

  return (
    <form action={createTeam} className="pm-card">
      <div className="pm-card-head">
        <div className="pm-card-chip">CREATE</div>
        <div className="pm-card-title">새 팀 만들기</div>
        <div className="pm-card-hint">회장이 되어 회원을 초대할 수 있어요.</div>
      </div>

      <div className="pm-field">
        <div className="pm-label">
          <span>팀 이름</span>
          <span className="pm-pill pm-pill--req">필수</span>
        </div>
        <div className="pm-input-wrap">
          <input
            className={`pm-input ${
              status === "taken" ? "is-error" : status === "available" ? "is-ok" : ""
            }`}
            name="teamName"
            placeholder="우리 팀의 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={30}
          />
          <NameStatusBadge status={status} />
        </div>
        <NameStatusMsg status={status} />
      </div>

      <div className="pm-field">
        <div className="pm-label">
          <span>종목</span>
        </div>
        <div className="pm-sport-row" role="radiogroup">
          <SportPick value="SOCCER" current={sport} onPick={setSport} label="축구" sub="11명" />
          <SportPick value="FUTSAL" current={sport} onPick={setSport} label="풋살" sub="5명" />
        </div>
      </div>

      <button type="submit" className="pm-cta" disabled={submitDisabled}>
        팀 만들고 시작하기
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
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// InviteCodeForm
// ─────────────────────────────────────────────────────────────
function InviteCodeForm({ defaultValue = "" }: { defaultValue?: string }) {
  const [code, setCode] = useState(defaultValue);
  return (
    <form action={joinTeam} className="pm-card">
      <div className="pm-card-head">
        <div className="pm-card-chip">JOIN</div>
        <div className="pm-card-title">초대 코드로 합류</div>
        <div className="pm-card-hint">회장에게 받은 6자리 코드를 입력하세요.</div>
      </div>

      <div className="pm-field">
        <div className="pm-label">
          <span>초대 코드</span>
          <span className="pm-pill pm-pill--req">필수</span>
        </div>
        <input
          className="pm-input pm-input--code"
          name="inviteCode"
          placeholder="ABC123"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          required
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={6}
        />
      </div>

      <button type="submit" className="pm-cta" disabled={code.length < 4}>
        팀 합류하기
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
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// SearchPanel
// ─────────────────────────────────────────────────────────────
type SearchResult = {
  id: string;
  name: string;
  sportType: string;
  memberCount: number;
  hasPendingRequest: boolean;
};

function SearchPanel() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/teams/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setResults(data.teams ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  async function handleJoin(teamId: string) {
    setJoiningId(teamId);
    setErr(null);
    try {
      const res = await fetch("/api/teams/join-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (res.ok) {
        setResults((prev) =>
          prev.map((t) => (t.id === teamId ? { ...t, hasPendingRequest: true } : t))
        );
      } else {
        const data = await res.json().catch(() => ({}));
        setErr(
          data.error === "already_member"
            ? "이미 해당 팀에 소속되어 있습니다."
            : data.error === "already_requested" || res.status === 409
            ? "이미 가입 신청한 팀입니다."
            : data.error ?? "가입 신청에 실패했습니다."
        );
      }
    } catch {
      setErr("네트워크 오류가 발생했습니다.");
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="pm-card">
      <div className="pm-card-head">
        <div className="pm-card-chip">SEARCH</div>
        <div className="pm-card-title">팀 검색해서 신청</div>
        <div className="pm-card-hint">회장이 신청을 승인하면 합류돼요.</div>
      </div>

      <div className="pm-field">
        <div className="pm-search-wrap">
          <svg width="16" height="16" viewBox="0 0 16 16" className="pm-search-icon" aria-hidden>
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
            <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            className="pm-input pm-input--search"
            placeholder="팀 이름으로 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="팀 검색"
          />
        </div>
      </div>

      {err && <p className="pm-help pm-help--err">{err}</p>}

      <div className="pm-results">
        {!q.trim() && (
          <div className="pm-empty">
            <div className="pm-empty-glyph" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="m13 13 3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <div>팀 이름을 입력하면 결과가 보여요.</div>
          </div>
        )}
        {loading && <div className="pm-empty pm-empty--muted">검색 중…</div>}
        {!loading && q.trim().length >= 2 && results.length === 0 && (
          <div className="pm-empty">
            <div>일치하는 팀이 없어요. 초대 코드로 가입하거나 새 팀을 만들어보세요.</div>
          </div>
        )}
        {!loading &&
          results.map((t) => (
            <div key={t.id} className="pm-result">
              <div className="pm-result-avatar" aria-hidden>
                {t.name.slice(0, 1)}
              </div>
              <div className="pm-result-body">
                <div className="pm-result-name">{t.name}</div>
                <div className="pm-result-meta">
                  {t.sportType === "SOCCER" ? "축구" : "풋살"} · {t.memberCount}명
                </div>
              </div>
              <button
                type="button"
                className={`pm-result-btn ${t.hasPendingRequest ? "is-pending" : ""}`}
                disabled={t.hasPendingRequest || joiningId === t.id}
                onClick={() => handleJoin(t.id)}
              >
                {t.hasPendingRequest
                  ? "신청됨"
                  : joiningId === t.id
                  ? "신청 중..."
                  : "가입 신청"}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AlreadyInTeamBanner
// ─────────────────────────────────────────────────────────────
function AlreadyInTeamBanner({ teamName }: { teamName: string }) {
  return (
    <Reveal delay={240} className="pm-alert">
      <div className="pm-alert-icon" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1l7 4v6c0 3-3 5-7 5s-7-2-7-5V5l7-4z" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="m5 8 2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="pm-alert-body">
        <div className="pm-alert-title">
          이미 <strong>{teamName || "현재 팀"}</strong>의 멤버예요
        </div>
        <div className="pm-alert-sub">대시보드에서 일정과 회원 관리를 이어가세요.</div>
      </div>
      <a href="/dashboard" className="pm-alert-btn">
        대시보드로
      </a>
    </Reveal>
  );
}

// ─────────────────────────────────────────────────────────────
// TeamClient
// ─────────────────────────────────────────────────────────────
export default function TeamClient({
  hasExistingTeam = false,
  currentTeamName = "",
}: Props) {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code") ?? "";
  const errorParam = searchParams.get("error");
  const pending = searchParams.get("pending");

  const branch: Branch = useMemo(() => {
    if (codeFromUrl) return "invite";
    if (hasExistingTeam) return "member";
    return "direct";
  }, [codeFromUrl, hasExistingTeam]);

  const [active, setActive] = useState<PathKey>(branch === "invite" ? "invite" : "create");

  // 온보딩 완료 신호 — completeOnboarding 이 ?welcome=onboarded 로 redirect
  useEffect(() => {
    if (searchParams.get("welcome") === "onboarded") {
      GA.onboardingComplete();
      const code = searchParams.get("code");
      const cleanUrl = code ? `/team?code=${encodeURIComponent(code)}` : "/team";
      window.history.replaceState(null, "", cleanUrl);
    }
  }, [searchParams]);

  const errorMessage =
    errorParam === "duplicate_name"
      ? "이미 사용 중인 팀명입니다. 다른 이름을 입력해주세요."
      : errorParam === "invalid_code"
      ? "유효하지 않은 초대 코드입니다."
      : errorParam === "expired_code"
      ? "만료된 초대 코드입니다."
      : errorParam === "already_member"
      ? "이미 해당 팀에 소속되어 있습니다."
      : errorParam === "already_requested"
      ? "이미 가입 신청한 팀입니다."
      : errorParam === "demo_blocked"
      ? "데모 모드에서는 팀 생성/가입이 불가합니다. 카카오 로그인 후 이용해주세요."
      : errorParam === "invalid_name"
      ? "팀 이름에 사용할 수 없는 문자가 포함되어 있습니다. 한글·영문·숫자로 2자 이상 입력해주세요."
      : errorParam === "rate_limit"
      ? "팀 생성 한도(시간 1팀·일 3팀)에 도달했습니다. 잠시 후 다시 시도해주세요."
      : errorParam === "invalid_message"
      ? "가입 메시지에 사용할 수 없는 문자가 포함되어 있습니다."
      : errorParam === "user_not_found"
      ? "사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요."
      : null;

  const headTitle =
    branch === "invite" ? (
      <>
        초대받았어요.
        <br />
        바로 합류할까요?
      </>
    ) : (
      <>
        어느 팀으로
        <br />
        시작할까요?
      </>
    );
  const headSub =
    branch === "invite" ? (
      <>
        받으신 초대 코드로 한 번에 합류할 수 있어요.
        <br />
        다른 방법으로 시작하고 싶다면 아래에서 선택하세요.
      </>
    ) : (
      <>
        초대 코드가 있으면 바로 합류,
        <br />
        없으면 새 팀을 만들어 회장으로 시작하세요.
      </>
    );

  return (
    <div className="pm-page">
      <div className="pm-amb" aria-hidden />
      <div className="pm-amb pm-amb--2" aria-hidden />

      <main className="pm-main">
        <Reveal as="header" className="pm-progress-wrap">
          <StepProgress current={2} />
        </Reveal>

        <Reveal delay={80}>
          <div className="pm-chip">
            <span className="pm-chip-dot" />
            <span>STEP 02 · TEAM</span>
          </div>
        </Reveal>

        <Reveal delay={140} as="h1" className="pm-h1">
          {headTitle}
        </Reveal>

        <Reveal delay={200} as="p" className="pm-sub">
          {headSub}
        </Reveal>

        {errorMessage && <div className="pm-notice pm-notice--err">{errorMessage}</div>}
        {pending && (
          <div className="pm-notice pm-notice--info">
            가입 신청이 완료되었습니다. 팀 관리자의 승인을 기다려주세요.
          </div>
        )}

        <div className="pm-form">
          {branch === "member" && <AlreadyInTeamBanner teamName={currentTeamName} />}

          <Reveal delay={260}>
            <PathPicker active={active} onChange={setActive} />
          </Reveal>

          <Reveal delay={320} keyOverride={active}>
            {active === "create" && <CreateTeamForm />}
            {active === "invite" && <InviteCodeForm defaultValue={codeFromUrl} />}
            {active === "search" && <SearchPanel />}
          </Reveal>

          {branch !== "invite" && (
            <Reveal delay={360} className="pm-demo">
              <DemoButton compact />
              <p className="pm-demo-sub">
                현재 계정에서 잠시 로그아웃돼요. 카카오로 다시 로그인하면 본인 계정으로
                돌아옵니다.
              </p>
            </Reveal>
          )}
        </div>
      </main>
    </div>
  );
}
