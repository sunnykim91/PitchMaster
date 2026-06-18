import type { PreferredPosition, SportType } from "@/lib/types";
import type { InternalSide } from "@/lib/internalSides";

export type AttendingPlayer = {
  /** 표시용 메인 id — 연동 회원은 users.id, 미연동·용병은 team_members.id / match_guests.id */
  id: string;
  name: string;
  preferredPosition: PreferredPosition; // 주 포지션 (하위 호환)
  preferredPositions?: PreferredPosition[]; // 복수 선호 포지션
  /** 용병 여부 — AI 프롬프트에 전달해 실력 불확실성 반영 */
  isGuest?: boolean;
  /**
   * 연동 회원의 users.id — squad가 user_id 또는 member_id 어느 쪽으로 저장돼도 매칭하기 위해 별도 보존.
   * 회원: id === userId 일 수 있고 그 경우 memberId도 있음. 미연동/용병은 undefined.
   */
  userId?: string;
  /**
   * team_members.id — 연동 회원이면 user_id 외에도 함께 보존. 미연동 회원은 id === memberId.
   */
  memberId?: string;
};

export type PlayerAssignment = AttendingPlayer & {
  quarters: number; // 0, 0.5, 1, ... quarterCount
  isGK: boolean;
};

export type SlotAssignment = {
  slotId: string;
  slotLabel: string;
  playerId: string;
  playerName: string;
  type: "full" | "first_half" | "second_half";
};

export type QuarterResult = {
  quarter: number;
  assignments: SlotAssignment[];
  /** 쿼터별 다른 포메이션 사용 시 (AI 풀 플랜 적용). 없으면 상위 formation 사용 */
  formationId?: string;
};

export type GeneratedSquad = {
  quarter_number: number;
  formation: string;
  positions: Record<string, { playerId: string; x: number; y: number; secondPlayerId?: string }>;
};

export type AutoFormationBuilderProps = {
  matchId: string;
  quarterCount: number;
  attendingPlayers: AttendingPlayer[];
  sportType?: SportType;
  /** 경기별 참가 인원 (축구 8/9/10/11, 풋살 3~6) */
  playerCount?: number;
  defaultFormationId?: string;
  side?: InternalSide;
  /** 이미 전술판에 편성이 저장된 상태인지 — 덮어쓰기 확인 다이얼로그 표시 기준 */
  hasExistingFormation?: boolean;
  /**
   * DB 에 저장된 쿼터별 편성 원본 — 새로고침·재진입 후 빌더 UI 복원용.
   * MatchTacticsTab 이 /api/squads 에서 fetch 해둔 dbSquads 를 그대로 전달.
   */
  initialSquads?: Array<{
    quarter_number: number;
    formation: string;
    positions: Record<string, { playerId: string; x: number; y: number; secondPlayerId?: string } | null>;
  }>;
  onGenerated?: (squads: GeneratedSquad[]) => void;
  /** AI 풀 플랜 응답의 coaching 본문을 상위에 전달 — AiCoachAnalysisCard 즉시 갱신용 */
  onAiCoachingReady?: (payload: { analysis: string; source: "ai" | "rule" }) => void;
  /** 자동 편성 결과가 바뀔 때 AI 코치 분석에 필요한 컨텍스트를 상위에 제공 */
  onAnalysisContextReady?: (ctx: {
    placement: Array<{ slot: string; playerName: string }>;
    quarterPlacements: Array<{ quarter: number; assignments: Array<{ slot: string; playerName: string }> }>;
    /** 쿼터별 포메이션 이름 — AI 가 가짜 포메이션 창작 방지용 */
    quarterFormations: Array<{ quarter: number; formation: string }>;
    attendees: Array<{ name: string; preferredPosition?: string | null; isGuest?: boolean }>;
    formationName: string;
    quarterCount: number;
    allSlotsFilled: boolean;
    /**
     * 편성을 어떤 방식으로 생성했는지 — AI 코치 어투 분기용.
     * - "rule": 팀 기본 포메이션 + 규칙 기반 배치 (AI가 포메이션 고른 것 아님)
     * - "ai-fixed": 팀 포메이션 고정, 배치만 AI 최적화
     * - "ai-free": AI 가 쿼터별로 포메이션을 직접 설계 (풀 플랜)
     * - "manual": DB 복원·수동 편집 케이스 (이번 세션에서 생성 버튼 안 누름)
     */
    generationMode: "rule" | "ai-fixed" | "ai-free" | "manual";
  } | null) => void;
  /** AI 코치 분석 버튼 표시 여부 (김선휘 Feature Flag) */
  enableAi?: boolean;
  /** 분석에 전달할 경기 맥락 */
  matchContext?: {
    matchType: "REGULAR" | "INTERNAL" | "EVENT";
    opponent: string | null;
  };
};
