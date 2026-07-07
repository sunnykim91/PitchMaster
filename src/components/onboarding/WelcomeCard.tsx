"use client";

import "@/app/onboarding/onboarding.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { shareTeamInvite } from "@/lib/kakaoShare";

/** 데이터 이관 문의 수신 이메일 (파일 첨부 가능). */
const MIGRATE_EMAIL = "tjsgnl2002@gmail.com";

export type WelcomeMatch = {
  id: string;
  when: string;
  where: string;
};

/** Phase 2 (68차C) — 신규 회장 5단계 온보딩 step.
 * getDashboardData.OnboardingStep 과 동일 구조. 별도 type 정의는 import 의존 회피용. */
export type OnboardingStep = {
  key: "team_created" | "members_invited" | "first_match" | "dues_setup" | "shared_to_chat";
  label: string;
  description: string;
  done: boolean;
  href?: string;
  action?: "kakaoShare";
};

export type WelcomeCardProps =
  | {
      variant: "created";
      teamName: string;
      teamId: string;
      inviteCode: string;
      steps?: OnboardingStep[];
      onDismiss: () => void;
    }
  | {
      variant: "joined";
      teamName: string;
      teamId: string;
      userId: string;
      nextMatch: WelcomeMatch | null;
      onDismiss: () => void;
    };

function ArrowSm() {
  return (
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
  );
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="pm-welcome-close" onClick={onClick} aria-label="환영 카드 닫기">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function Chip() {
  return (
    <div className="pm-chip pm-chip--inline">
      <span className="pm-chip-dot" />
      <span>3단계 · 시작</span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path
        d="M3 7l3 3 5-6"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WelcomeCreated({
  teamName,
  inviteCode,
  steps,
  onDismiss,
  teamId,
}: {
  teamName: string;
  inviteCode: string;
  steps?: OnboardingStep[];
  onDismiss: () => void;
  teamId: string;
}) {
  const [copied, setCopied] = useState(false);
  // 단톡방 공유는 서버에서 추적 불가 → 클라이언트 localStorage 로 마지막 단계만 보강
  const [sharedToChat, setSharedToChat] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !teamId) return;
    try {
      if (localStorage.getItem(`team_shared_to_chat:${teamId}`) === "1") {
        setSharedToChat(true);
      }
    } catch { /* localStorage 차단 환경 무시 */ }
  }, [teamId]);

  const onCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(inviteCode).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const onShare = () => {
    shareTeamInvite({ teamName: teamName || "우리 팀", inviteCode });
    // 공유 버튼 클릭 = "단톡방 공유" 단계 완료로 간주
    if (typeof window !== "undefined" && teamId) {
      try { localStorage.setItem(`team_shared_to_chat:${teamId}`, "1"); } catch {}
    }
    setSharedToChat(true);
  };

  // SSR steps 와 클라이언트 sharedToChat 머지
  const effectiveSteps: OnboardingStep[] = (steps ?? []).map((s) =>
    s.key === "shared_to_chat" ? { ...s, done: s.done || sharedToChat } : s
  );
  const doneCount = effectiveSteps.filter((s) => s.done).length;
  const totalCount = effectiveSteps.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // 기존 엑셀·타 앱 기록 이관 문의 (신규 회장 대상). 파일 첨부 가능한 이메일로 연결.
  const migrateMailto = `mailto:${MIGRATE_EMAIL}?subject=${encodeURIComponent(
    `[PitchMaster] ${teamName || "우리 팀"} 데이터 이관 문의`,
  )}&body=${encodeURIComponent(
    [
      `안녕하세요! ${teamName || "우리 팀"} 팀의 기존 기록을 옮기고 싶어요.`,
      "",
      "• 자료 형태 (엑셀 / 다른 앱 / 사진 등):",
      "• 옮기고 싶은 내용 (회원 명단 / 경기 기록 / 회비 등):",
      "",
      "※ 가지고 계신 파일을 이 메일에 첨부해 보내주시면 확인 후 옮겨드릴게요.",
    ].join("\n"),
  )}`;

  return (
    <div className="pm-welcome">
      <CloseBtn onClick={onDismiss} />
      <Chip />

      <h2 className="pm-welcome-h">
        이제 진짜
        <br />
        시작이에요.
      </h2>
      <p className="pm-welcome-sub">
        <strong>{teamName}</strong>의 회장으로 등록됐어요.
        <br />
        첫 경기를 만들고 단톡방에 공유하면 팀원이 모여요.
      </p>

      <div className="pm-invite">
        <div>
          <div className="pm-invite-label">초대 코드</div>
          <div className="pm-invite-code" aria-label={`초대 코드 ${inviteCode}`}>
            {inviteCode.split("").map((c, i) => (
              <span key={i}>{c}</span>
            ))}
          </div>
        </div>
        <div className="pm-invite-actions">
          <button
            type="button"
            className="pm-invite-btn pm-invite-btn--ghost"
            onClick={onCopy}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <rect x="4" y="4" width="7" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="none" />
              <path
                d="M3 10V3.5C3 3 3.5 2.5 4 2.5h6"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            {copied ? "복사됨" : "복사"}
          </button>
          <button type="button" className="pm-invite-btn pm-invite-btn--kakao" onClick={onShare}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path
                d="M7 1.5c-3.3 0-6 2-6 4.6 0 1.7 1.2 3.2 3 4l-.6 2.4 2.7-1.6c.3 0 .6.1.9.1 3.3 0 6-2 6-4.6 0-2.5-2.7-4.6-6-4.6z"
                fill="currentColor"
              />
            </svg>
            단톡방에 공유
          </button>
        </div>
      </div>

      {/* 기존 데이터 이관 안내 — 엑셀·타 앱 기록을 옮겨오려는 신규 회장용 */}
      <a className="pm-migrate" href={migrateMailto}>
        <span className="pm-migrate-icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 6l7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="pm-migrate-body">
          <span className="pm-migrate-title">예전 기록, 그대로 옮겨드려요</span>
          <span className="pm-migrate-sub">엑셀·다른 앱에 쌓아둔 회원·경기 기록이 있다면 이메일로 문의 →</span>
        </span>
      </a>

      {/* 5단계 체크리스트 (Phase 2 — 68차C) */}
      {effectiveSteps.length > 0 && (
        <div className="pm-steps">
          <div className="pm-steps-h">
            <span className="pm-steps-label">운영 시작 체크리스트</span>
            <span className="pm-steps-count">{doneCount}/{totalCount}</span>
          </div>
          <div className="pm-steps-progress" aria-hidden>
            <div className="pm-steps-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <ul className="pm-steps-list">
            {effectiveSteps.map((step, i) => {
              const inner = (
                <>
                  <span className={`pm-steps-check ${step.done ? "pm-steps-check--done" : ""}`} aria-hidden>
                    {step.done ? <CheckIcon /> : <span className="pm-steps-num">{i + 1}</span>}
                  </span>
                  <span className="pm-steps-body">
                    <span className={`pm-steps-title ${step.done ? "pm-steps-title--done" : ""}`}>{step.label}</span>
                    <span className="pm-steps-desc">{step.description}</span>
                  </span>
                  {!step.done && <ArrowSm />}
                </>
              );

              if (step.done) {
                return (
                  <li key={step.key} className="pm-steps-item pm-steps-item--done">
                    {inner}
                  </li>
                );
              }
              if (step.action === "kakaoShare") {
                return (
                  <li key={step.key}>
                    <button type="button" className="pm-steps-item" onClick={onShare}>
                      {inner}
                    </button>
                  </li>
                );
              }
              return (
                <li key={step.key}>
                  <Link className="pm-steps-item" href={step.href ?? "#"}>
                    {inner}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function WelcomeJoined({
  teamName,
  teamId,
  userId,
  nextMatch,
  onDismiss,
}: {
  teamName: string;
  teamId: string;
  userId: string;
  nextMatch: WelcomeMatch | null;
  onDismiss: () => void;
}) {
  return (
    <div className="pm-welcome">
      <CloseBtn onClick={onDismiss} />
      <Chip />

      <h2 className="pm-welcome-h">
        <strong>{teamName}</strong>에<br />
        합류했어요.
      </h2>
      <p className="pm-welcome-sub">
        회장이 일정을 올리면 알림으로 알려드려요.
        <br />
        지금 바로 다음 경기 참석을 알려두세요.
      </p>

      {nextMatch ? (
        <div className="pm-match">
          <div>
            <div className="pm-match-label">다음 경기</div>
            <div className="pm-match-when">{nextMatch.when}</div>
            <div className="pm-match-where">{nextMatch.where}</div>
          </div>
          <Link href={`/matches/${nextMatch.id}`} className="pm-match-cta">
            참석 투표
            <ArrowSm />
          </Link>
        </div>
      ) : (
        <div className="pm-match pm-match--empty">
          <div>
            <div className="pm-match-label">다음 경기</div>
            <div className="pm-match-when pm-match-when--empty">아직 일정이 없어요</div>
            <div className="pm-match-where">회장이 올리면 알림 받아요</div>
          </div>
        </div>
      )}

      <div className="pm-next">
        <div className="pm-next-label">다음 할 일</div>
        <div className="pm-next-actions">
          <Link
            className="pm-next-action"
            href={`/player/${userId}${teamId ? `?team=${teamId}` : ""}`}
          >
            <span className="pm-next-num">01</span>
            <span>프로필 보완하기</span>
            <ArrowSm />
          </Link>
          <Link className="pm-next-action" href="/members">
            <span className="pm-next-num">02</span>
            <span>팀원 둘러보기</span>
            <ArrowSm />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function WelcomeCard(props: WelcomeCardProps) {
  if (props.variant === "created") {
    return (
      <div className="pm-welcome-wrap">
        <WelcomeCreated
          teamName={props.teamName}
          teamId={props.teamId}
          inviteCode={props.inviteCode}
          steps={props.steps}
          onDismiss={props.onDismiss}
        />
      </div>
    );
  }
  return (
    <div className="pm-welcome-wrap">
      <WelcomeJoined
        teamName={props.teamName}
        teamId={props.teamId}
        userId={props.userId}
        nextMatch={props.nextMatch}
        onDismiss={props.onDismiss}
      />
    </div>
  );
}
