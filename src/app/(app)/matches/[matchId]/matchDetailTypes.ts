/**
 * MatchDetailClient에서 분리된 탭 컴포넌트들이 공유하는 타입 정의
 */
import type { Role, DetailedPosition, SportType } from "@/lib/types";

/* ── API response row types (snake_case from DB) ── */

export type MatchRow = {
  id: string;
  match_date: string;
  match_time: string | null;
  match_end_time: string | null;
  match_end_date: string | null;
  location: string | null;
  opponent_name: string | null;
  quarter_count: number;
  quarter_duration: number;
  break_duration: number;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
  uniform_type?: "HOME" | "AWAY";
  match_type?: "REGULAR" | "INTERNAL" | "EVENT";
  stats_included?: boolean;
  vote_deadline?: string | null;
};

export type GoalType = "NORMAL" | "PK" | "FK" | "HEADER" | "OWN_GOAL";

export const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: "NORMAL", label: "일반" },
  { value: "PK", label: "PK" },
  { value: "FK", label: "FK" },
  { value: "HEADER", label: "헤딩" },
  { value: "OWN_GOAL", label: "자책골" },
];

export type GoalRow = {
  id: string;
  match_id: string;
  quarter_number: number;
  minute: number | null;
  scorer_id: string;
  assist_id: string | null;
  is_own_goal: boolean;
  goal_type?: string;
  recorded_by: string;
  side?: "A" | "B" | null;
};

export type MvpVoteRow = {
  match_id: string;
  voter_id: string;
  candidate_id: string;
};

export type AttendanceRow = {
  user_id: string | null;
  member_id: string | null;
  actually_attended: boolean | null;
  attendance_status?: string | null;
};

export type GuestRow = {
  id: string;
  match_id: string;
  name: string;
  position: string | null;
  phone: string | null;
  note: string | null;
};

export type AttendanceVoteRow = {
  id: string;
  match_id: string;
  user_id: string | null;
  member_id: string | null;
  vote: "ATTEND" | "ABSENT" | "MAYBE";
  voted_at?: string | null;
  users: { id: string; name: string; preferred_positions?: string[] } | null;
  member: { id: string; pre_name: string | null; user_id: string | null; coach_positions?: string[] | null; users: { id: string; name: string; preferred_positions?: string[] } | null } | null;
};

export type DiaryRow = {
  match_id: string;
  weather: string | null;
  condition: string | null;
  memo: string | null;
  photos: string[] | null;
} | null;

export type MemberRow = {
  id: string;
  role: string;
  user_id: string | null;
  pre_name: string | null;
  users: {
    id: string;
    name: string;
    preferred_positions?: string[];
  } | null;
};

/* ── Client-side types (camelCase) ── */

export type MatchType = "REGULAR" | "INTERNAL" | "EVENT";

export type Match = {
  id: string;
  date: string;
  time: string;
  endTime?: string | null;
  endDate?: string | null;
  location: string;
  opponent?: string;
  quarterCount: number;
  quarterDuration: number;
  breakDuration: number;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
  uniformType: "HOME" | "AWAY";
  matchType: MatchType;
  statsIncluded: boolean;
  voteDeadline?: string | null;
};

export type GoalEvent = {
  id: string;
  scorerId: string;
  assistId?: string;
  quarter: number;
  minute: number;
  isOwnGoal?: boolean;
  goalType: GoalType;
  side?: "A" | "B" | null;
};

export type Guest = {
  id: string;
  name: string;
  position?: string;
  phone?: string;
  note?: string;
};

export type MatchDiary = {
  weather?: string;
  condition?: string;
  memo?: string;
  photos?: string[];
};

/** 자체전 팀 편성 */
export type InternalTeamAssignment = {
  playerId: string;
  side: "A" | "B";
};

export type VoteState = Record<string, string>;

export type AttendanceState = Record<string, "PRESENT" | "ABSENT" | "LATE">;

/** baseRoster 아이템 타입 */
export type RosterPlayer = {
  id: string;
  memberId: string;
  name: string;
  role: DetailedPosition;
  isLinked: boolean;
};

/** 전술판/골 기록에서 사용하는 간소화된 roster 아이템 */
export type SimpleRosterPlayer = {
  id: string;
  name: string;
  role: DetailedPosition;
};

/* ── 상수 ── */

/** 기본 제공되는 특수 선택지 */
export const SPECIAL_PLAYERS = [
  { id: "UNKNOWN", name: "모름" },
  { id: "OPPONENT", name: "실점 (상대팀)" },
] as const;

export const WEATHER_OPTIONS = ["맑음", "흐림", "비", "눈", "바람"] as const;
export const CONDITION_OPTIONS = ["최상", "좋음", "보통", "나쁨", "최악"] as const;

export { voteStyles } from "@/lib/voteStyles";

/* ── Mapper functions ── */

export const emptyMatch: Match = {
  id: "",
  date: "",
  time: "",
  location: "",
  opponent: "",
  quarterCount: 4,
  quarterDuration: 25,
  breakDuration: 5,
  status: "SCHEDULED",
  uniformType: "HOME",
  matchType: "REGULAR",
  statsIncluded: true,
  voteDeadline: null,
};

export function mapMatch(row: MatchRow): Match {
  return {
    id: row.id,
    date: row.match_date,
    time: row.match_time ?? "",
    endTime: row.match_end_time ?? null,
    endDate: row.match_end_date ?? null,
    location: row.location ?? "",
    opponent: row.opponent_name ?? undefined,
    quarterCount: row.quarter_count,
    quarterDuration: row.quarter_duration,
    breakDuration: row.break_duration,
    status: row.status,
    uniformType: row.uniform_type ?? "HOME",
    matchType: row.match_type ?? "REGULAR",
    statsIncluded: row.stats_included ?? true,
    voteDeadline: row.vote_deadline ?? null,
  };
}

export function mapGoal(row: GoalRow): GoalEvent {
  return {
    id: row.id,
    scorerId: row.scorer_id,
    assistId: row.assist_id ?? undefined,
    quarter: row.quarter_number,
    minute: row.minute ?? 0,
    isOwnGoal: row.is_own_goal,
    goalType: (row.goal_type as GoalType) ?? "NORMAL",
    side: row.side ?? null,
  };
}

export function mapGuest(row: GuestRow): Guest {
  return {
    id: row.id,
    name: row.name,
    position: row.position ?? undefined,
    phone: row.phone ?? undefined,
    note: row.note ?? undefined,
  };
}

export function mapDiary(row: DiaryRow): MatchDiary {
  if (!row) return {};
  return {
    weather: row.weather ?? undefined,
    condition: row.condition ?? undefined,
    memo: row.memo ?? undefined,
    photos: row.photos ?? undefined,
  };
}

export function mapVotes(rows: MvpVoteRow[]): VoteState {
  const state: VoteState = {};
  for (const v of rows) {
    state[v.voter_id] = v.candidate_id;
  }
  return state;
}

export function mapAttendance(rows: AttendanceRow[]): AttendanceState {
  const state: AttendanceState = {};
  for (const a of rows) {
    // attendance_status 우선, 없으면 actually_attended에서 추론
    let status: "PRESENT" | "ABSENT" | "LATE" | undefined;
    if (a.attendance_status === "PRESENT" || a.attendance_status === "LATE" || a.attendance_status === "ABSENT") {
      status = a.attendance_status;
    } else {
      status = a.actually_attended === true ? "PRESENT" : a.actually_attended === false ? "ABSENT" : undefined;
    }
    if (!status) continue;
    if (a.user_id) state[a.user_id] = status;
    if (a.member_id) state[a.member_id] = status;
  }
  return state;
}
