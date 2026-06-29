// 관리자 대시보드 공통 타입 + 빈 데이터 (AdminClient + 각 탭 컴포넌트 공유)

export type TeamDetail = {
  id: string;
  name: string;
  sportType: string;
  isSearchable: boolean;
  createdAt: string;
  memberCount: number;
  matchCount: number;
  lastMatch: string | null;
  postCount: number;
  pendingRequests: number;
  status: "active" | "dormant" | "unused";
};

export type PendingRequest = {
  id: string;
  teamId: string;
  teamName: string;
  name: string;
  createdAt: string;
};

export type RecentSignupUser = {
  id: string;
  name: string;
  createdAt: string;
  profileComplete: boolean;
  teamName: string | null;
};

export type RecentSignupTeam = {
  id: string;
  name: string;
  sportType: string;
  createdAt: string;
  memberCount: number;
};

export type SignupSourceCohort = {
  source: string;
  signups: number;
  activeUsers: number;
  activeRate: number;
};

export type AdminOverview = {
  totalTeams: number;
  totalUsers: number;
  profileComplete: number;
  newUsersThisWeek: number;
  totalMatches: number;
  totalPosts: number;
  activeTeams: number;
  activeUsers: number;
  pendingJoinRequests: number;
};

export type AdminStats = {
  overview: AdminOverview;
  teams: TeamDetail[];
  pendingRequests: PendingRequest[];
  recentSignups: { users: RecentSignupUser[]; teams: RecentSignupTeam[] };
  signupSourceCohorts: SignupSourceCohort[];
};

export const emptyData: AdminStats = {
  overview: {
    totalTeams: 0,
    totalUsers: 0,
    profileComplete: 0,
    newUsersThisWeek: 0,
    totalMatches: 0,
    totalPosts: 0,
    activeTeams: 0,
    activeUsers: 0,
    pendingJoinRequests: 0,
  },
  teams: [],
  pendingRequests: [],
  recentSignups: { users: [], teams: [] },
  signupSourceCohorts: [],
};
