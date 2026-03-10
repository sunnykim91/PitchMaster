export type Role = "PRESIDENT" | "STAFF" | "MEMBER";
export type PreferredFoot = "RIGHT" | "LEFT" | "BOTH";
export type Position = "GK" | "DF" | "MF" | "FW";
export type DetailedPosition =
  | "GK" | "RB" | "RCB" | "CB" | "LCB" | "LB"
  | "RWB" | "LWB" | "RDM" | "LDM" | "CDM"
  | "RCM" | "CM" | "LCM" | "CAM" | "RAM" | "LAM"
  | "RM" | "LM" | "RW" | "LW" | "CF" | "ST" | "RS" | "LS";

export type MatchStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
export type AttendanceVote = "ATTEND" | "ABSENT" | "MAYBE";
export type DuesType = "INCOME" | "EXPENSE";
export type PostCategory = "FREE" | "GALLERY";
export type RuleCategory = "일반" | "회비" | "경조사" | "기타";
export type JoinMode = "AUTO" | "MANUAL";
export type MemberStatus = "ACTIVE" | "PENDING" | "BANNED";

export type SessionUser = {
  id: string;
  name?: string;
  birthDate?: string;
  phone?: string;
  preferredPositions?: Position[];
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
