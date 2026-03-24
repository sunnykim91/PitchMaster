export type Role = "PRESIDENT" | "STAFF" | "MEMBER";
export type PreferredFoot = "RIGHT" | "LEFT" | "BOTH";
export type Position = "GK" | "DF" | "MF" | "FW";

/** 세분화된 선호 포지션 (10개) */
export type PreferredPosition =
  | "GK"   // 골키퍼
  | "CB"   // 센터백 (Centre Back)
  | "LB"   // 좌측 윙백 (Left Back)
  | "RB"   // 우측 윙백 (Right Back)
  | "CDM"  // 수비형 미드필더 (Central Defensive Midfielder)
  | "CM"   // 중앙 미드필더 (Central Midfielder)
  | "CAM"  // 공격형 미드필더 (Central Attacking Midfielder)
  | "LW"   // 좌측 윙어 (Left Winger)
  | "RW"   // 우측 윙어 (Right Winger)
  | "ST";  // 스트라이커 (Striker)

/** PreferredPosition → Position 매핑 */
export const PREF_TO_POSITION: Record<PreferredPosition, Position> = {
  GK: "GK",
  CB: "DF",
  LB: "DF",
  RB: "DF",
  CDM: "MF",
  CM: "MF",
  CAM: "MF",
  LW: "FW",
  RW: "FW",
  ST: "FW",
};

/** PreferredPosition 한국어 라벨 */
export const PREF_POSITION_LABEL: Record<PreferredPosition, string> = {
  GK: "골키퍼",
  CB: "센터백",
  LB: "좌측 윙백",
  RB: "우측 윙백",
  CDM: "수비형 미드필더",
  CM: "중앙 미드필더",
  CAM: "공격형 미드필더",
  LW: "좌측 윙어",
  RW: "우측 윙어",
  ST: "스트라이커",
};

/** PreferredPosition 짧은 라벨 */
export const PREF_POSITION_SHORT: Record<PreferredPosition, string> = {
  GK: "GK",
  CB: "CB",
  LB: "LB",
  RB: "RB",
  CDM: "CDM",
  CM: "CM",
  CAM: "CAM",
  LW: "LW",
  RW: "RW",
  ST: "ST",
};

/** 포지션 그룹 (UI 표시용) */
export const POSITION_GROUPS: { group: string; positions: PreferredPosition[] }[] = [
  { group: "골키퍼", positions: ["GK"] },
  { group: "수비", positions: ["CB", "LB", "RB"] },
  { group: "미드필더", positions: ["CDM", "CM", "CAM"] },
  { group: "공격", positions: ["LW", "RW", "ST"] },
];

export type DetailedPosition =
  | "GK" | "RB" | "RCB" | "CB" | "LCB" | "LB"
  | "RWB" | "LWB" | "RDM" | "LDM" | "CDM"
  | "RCM" | "CM" | "LCM" | "CAM" | "RAM" | "LAM"
  | "RM" | "LM" | "RW" | "LW" | "CF" | "ST" | "RS" | "LS";

export type MatchStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
export type AttendanceVote = "ATTEND" | "ABSENT" | "MAYBE";
export type DuesType = "INCOME" | "EXPENSE";
export type PostCategory = "FREE" | "GALLERY"; // legacy, category 구분 제거됨
export type RuleCategory = "일반" | "회비" | "경조사" | "기타";
export type JoinMode = "AUTO" | "MANUAL";
export type MemberStatus = "ACTIVE" | "PENDING" | "BANNED";
export type SportType = "SOCCER" | "FUTSAL";

/** 풋살 전용 포지션 */
export type FutsalPosition = "GK" | "FIXO" | "ALA" | "PIVO";

export const SPORT_TYPE_LABEL: Record<SportType, string> = {
  SOCCER: "축구",
  FUTSAL: "풋살",
};

export const FUTSAL_POSITION_LABEL: Record<FutsalPosition, string> = {
  GK: "골레이루 (GK)",
  FIXO: "피소 (수비)",
  ALA: "아라 (측면)",
  PIVO: "피벗 (공격)",
};

export const FUTSAL_POSITION_SHORT: Record<FutsalPosition, string> = {
  GK: "GK",
  FIXO: "FIXO",
  ALA: "ALA",
  PIVO: "PIVO",
};

export const FUTSAL_POSITION_GROUPS: { group: string; positions: FutsalPosition[] }[] = [
  { group: "골키퍼", positions: ["GK"] },
  { group: "수비", positions: ["FIXO"] },
  { group: "측면", positions: ["ALA"] },
  { group: "공격", positions: ["PIVO"] },
];

/** 스포츠별 경기 기본값 */
export const SPORT_DEFAULTS: Record<SportType, { playerCount: number; quarters: number; duration: number; breakTime: number }> = {
  SOCCER: { playerCount: 11, quarters: 4, duration: 25, breakTime: 5 },
  FUTSAL: { playerCount: 6, quarters: 8, duration: 12, breakTime: 3 },
};

export type SessionUser = {
  id: string;
  name?: string;
  birthDate?: string;
  phone?: string;
  preferredPositions?: PreferredPosition[];
  preferredFoot?: PreferredFoot;
  profileImageUrl?: string;
  isProfileComplete?: boolean;
  teamId?: string;
  teamName?: string;
  teamRole?: Role;
  inviteCode?: string;
  isDemo?: boolean;
};

export type Session = {
  user: SessionUser;
};

// DB row types
export type DbTeam = {
  id: string;
  name: string;
  logo_url: string | null;
  invite_code: string;
  invite_expires_at: string | null;
  join_mode: JoinMode;
  sport_type: SportType;
  created_at: string;
};

export type DbUser = {
  id: string;
  kakao_id: string | null;
  name: string;
  birth_date: string | null;
  phone: string | null;
  preferred_positions: string[];
  preferred_foot: PreferredFoot | null;
  profile_image_url: string | null;
  is_profile_complete: boolean;
  created_at: string;
};

export type DbTeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  role: Role;
  status: MemberStatus;
  joined_at: string;
};

export type DbSeason = {
  id: string;
  team_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
};

export type DbMatch = {
  id: string;
  team_id: string;
  season_id: string | null;
  opponent_name: string | null;
  match_date: string;
  match_time: string | null;
  location: string | null;
  quarter_count: number;
  quarter_duration: number;
  break_duration: number;
  player_count: number;
  status: MatchStatus;
  vote_deadline: string | null;
  created_by: string | null;
  created_at: string;
};

export type DbMatchAttendance = {
  id: string;
  match_id: string;
  user_id: string;
  vote: AttendanceVote;
  actually_attended: boolean | null;
  voted_at: string;
};

export type DbMatchSquad = {
  id: string;
  match_id: string;
  quarter_number: number;
  formation: string | null;
  positions: Record<string, unknown>;
  created_at: string;
};

export type DbMatchGoal = {
  id: string;
  match_id: string;
  quarter_number: number;
  minute: number | null;
  scorer_id: string | null;
  assist_id: string | null;
  is_own_goal: boolean;
  recorded_by: string | null;
  created_at: string;
};

export type DbMvpVote = {
  id: string;
  match_id: string;
  voter_id: string;
  candidate_id: string;
  created_at: string;
};

export type DbDuesSetting = {
  id: string;
  team_id: string;
  member_type: string;
  monthly_amount: number;
  description: string | null;
  created_at: string;
};

export type DbDuesRecord = {
  id: string;
  team_id: string;
  user_id: string | null;
  type: DuesType;
  amount: number;
  description: string | null;
  screenshot_url: string | null;
  recorded_by: string | null;
  recorded_at: string;
};

export type DbRule = {
  id: string;
  team_id: string;
  title: string;
  content: string;
  category: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbPost = {
  id: string;
  team_id: string;
  author_id: string;
  title: string;
  content: string;
  category: PostCategory;
  image_urls: string[];
  is_pinned: boolean;
  pinned_at: string | null;
  created_at: string;
};

export type DbComment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

export type DbNotification = {
  id: string;
  user_id: string;
  team_id: string | null;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
};
