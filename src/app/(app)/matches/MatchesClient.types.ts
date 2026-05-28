export type MatchStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
export type AttendanceVote = "ATTEND" | "ABSENT" | "MAYBE";

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
  status: MatchStatus;
  voteDeadline?: string;
  score?: string | null;
  uniformType: "HOME" | "AWAY" | "THIRD";
  matchType: "REGULAR" | "INTERNAL" | "EVENT";
  sportType?: "SOCCER" | "FUTSAL" | null;
  playerCount?: number;
  statsIncluded: boolean;
};

export type DbMatch = {
  id: string;
  team_id: string;
  opponent_name: string;
  match_date: string;
  match_time: string;
  match_end_time: string | null;
  match_end_date: string | null;
  location: string;
  quarter_count: number;
  quarter_duration: number;
  break_duration: number;
  status: MatchStatus;
  vote_deadline: string | null;
  score?: string | null;
  uniform_type?: string | null;
  match_type?: string | null;
  sport_type?: string | null;
  player_count?: number | null;
  stats_included?: boolean | null;
  created_by: string;
  created_at: string;
};

export type DbAttendance = {
  match_id: string;
  user_id: string | null;
  member_id: string | null;
  vote: AttendanceVote;
  users: { name: string } | null;
  member?: { id: string; user_id: string | null } | null;
};

export type AttendanceState = Record<string, Record<string, AttendanceVote>>;

export type UniformSetInfo = { primary: string; secondary: string; pattern: string };

export type TeamUniform = {
  primary: string | null;
  secondary: string | null;
  pattern: string | null;
  uniforms?: { home?: UniformSetInfo; away?: UniformSetInfo; third?: UniformSetInfo | null } | null;
};
