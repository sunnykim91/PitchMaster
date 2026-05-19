"use client";

import "@/app/onboarding/onboarding.css";
import Link from "next/link";
import { useState } from "react";
import { shareTeamInvite } from "@/lib/kakaoShare";

export type WelcomeMatch = {
  id: string;
  when: string;
  where: string;
};

export type WelcomeCardProps =
  | {
      variant: "created";
      teamName: string;
      teamId: string;
      inviteCode: string;
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

function WelcomeCreated({
  teamName,
  inviteCode,
  onDismiss,
}: {
  teamName: string;
  inviteCode: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(inviteCode).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const onShare = () => {
    shareTeamInvite({ teamName: teamName || "우리 팀", inviteCode });
  };

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
        멤버를 초대해 함께 시작하세요.
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

      <div className="pm-next">
        <div className="pm-next-label">다음 할 일</div>
        <div className="pm-next-actions">
          <Link className="pm-next-action" href="/members">
            <span className="pm-next-num">01</span>
            <span>회원 일괄 등록</span>
            <ArrowSm />
          </Link>
          <Link className="pm-next-action" href="/matches">
            <span className="pm-next-num">02</span>
            <span>첫 경기 만들기</span>
            <ArrowSm />
          </Link>
          <Link className="pm-next-action" href="/rules">
            <span className="pm-next-num">03</span>
            <span>회칙 작성</span>
            <ArrowSm />
          </Link>
        </div>
      </div>
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
          inviteCode={props.inviteCode}
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
