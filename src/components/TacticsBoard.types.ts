import type { DetailedPosition, SportType } from "@/lib/types";
import type { InternalSide } from "@/lib/internalSides";

export type Player = {
  id: string;
  name: string;
  role: DetailedPosition;
  /** 멤버 프로필의 전체 선호 포지션 배열 (슬롯 포지션 매칭 표시용) */
  preferredPositions?: DetailedPosition[];
};

export type TacticsBoardProps = {
  matchId: string;
  roster: Player[];
  quarterCount: number;
  sportType?: SportType;
  /** 경기별 참가 인원 (축구 8/9/10/11, 풋살 3~6). 미지정 시 11(축구) 또는 기존 풋살 UI */
  playerCount?: number;
  teamSettings?: TeamSettings;
  initialSquads?: SquadRow[]; // 외부에서 주입 시 API fetch skip
  defaultFormationId?: string; // 팀 기본 포메이션
  readOnly?: boolean; // MEMBER: 조회만 가능
  side?: InternalSide; // 자체전 팀 구분 (A/B/C)
  /** 이 경기에서 선택한 유니폼 (홈/원정/써드). 미지정 시 홈. 저지 배지·공유 이미지 색상에 반영 */
  uniformType?: "HOME" | "AWAY" | "THIRD";
};

export type Placement = {
  playerId: string;
  x: number;
  y: number;
  secondPlayerId?: string; // 0.5Q 후반 선수
};

export type BoardState = {
  formationId: string;
  placements: Record<string, Placement | null>;
};

export type UniformSet = { primary: string; secondary: string; pattern: string };

export type TeamSettings = {
  uniformPrimary: string;
  uniformSecondary: string;
  uniformPattern?: "SOLID" | "STRIPES_VERTICAL" | "STRIPES_HORIZONTAL" | "STRIPES_DIAGONAL";
  uniforms?: { home?: UniformSet; away?: UniformSet; third?: UniformSet | null } | null;
};

export type SquadRow = {
  id: string;
  match_id: string;
  quarter_number: number;
  formation: string;
  positions: Record<string, Placement | null>;
};

export type SquadsApiResponse = {
  squads: SquadRow[];
};

export type TeamApiResponse = {
  team: {
    name: string;
    logo_url: string;
    invite_code: string;
    uniform_primary: string;
    uniform_secondary: string;
    uniform_pattern: TeamSettings["uniformPattern"];
    uniforms?: TeamSettings["uniforms"];
  };
};
