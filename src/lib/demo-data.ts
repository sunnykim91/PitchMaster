import type { DetailedPosition, Role } from "@/lib/types";

export type DemoMember = {
  id: string;
  name: string;
  role: Role;
  preferredPositions: DetailedPosition[];
  preferredFoot: "RIGHT" | "LEFT" | "BOTH";
  phone: string;
  birthDate: string;
};

export const demoMembers: DemoMember[] = [
  {
    id: "m1",
    name: "김태훈",
    role: "PRESIDENT",
    preferredPositions: ["CM"],
    preferredFoot: "RIGHT",
    phone: "010-1234-5678",
    birthDate: "1991-04-11",
  },
  {
    id: "m2",
    name: "박민수",
    role: "STAFF",
    preferredPositions: ["CB", "CDM"],
    preferredFoot: "BOTH",
    phone: "010-4821-1309",
    birthDate: "1989-10-03",
  },
  {
    id: "m3",
    name: "이서연",
    role: "MEMBER",
    preferredPositions: ["ST"],
    preferredFoot: "LEFT",
    phone: "010-7733-9192",
    birthDate: "1996-07-22",
  },
  {
    id: "m4",
    name: "정우진",
    role: "MEMBER",
    preferredPositions: ["GK"],
    preferredFoot: "RIGHT",
    phone: "010-5550-2891",
    birthDate: "1993-01-17",
  },
  {
    id: "m5",
    name: "한지우",
    role: "MEMBER",
    preferredPositions: ["CAM", "RW"],
    preferredFoot: "RIGHT",
    phone: "010-1911-0081",
    birthDate: "1998-05-09",
  },
];

export const demoDashboard = {
  upcomingMatch: {
    id: "match-1",
    date: "2026-02-14",
    time: "19:30",
    location: "잠실 풋살 센터 A구장",
    opponent: "한강 유나이티드",
  },
  activeVotes: [
    { id: "vote-1", title: "2/14 경기 참석 투표", due: "2026-02-12 21:00" },
    { id: "vote-2", title: "2/01 경기 MVP 투표", due: "2026-02-06 20:00" },
  ],
  tasks: [
    "2/01 경기 MVP 투표 완료하기",
    "이번 달 회비 납부 내역 확인",
    "프로필 사진 업로드",
  ],
  recentResult: {
    id: "match-0",
    date: "2026-02-01",
    score: "3 : 2",
    opponent: "드림 FC",
    highlights: ["김태훈 2골", "이서연 1골 1어시스트", "MVP: 박민수"],
  },
};

export type DemoSeason = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export const demoSeasons: DemoSeason[] = [
  {
    id: "season-2025-2",
    name: "2025 하반기",
    startDate: "2025-07-01",
    endDate: "2025-12-31",
    isActive: false,
  },
  {
    id: "season-2026-1",
    name: "2026 상반기",
    startDate: "2026-01-01",
    endDate: "2026-06-30",
    isActive: true,
  },
];

export type DemoSeasonRecord = {
  seasonId: string;
  stats: Array<{
    memberId: string;
    goals: number;
    assists: number;
    mvp: number;
    attendanceRate: number;
  }>;
};

export const demoSeasonRecords: DemoSeasonRecord[] = [
  {
    seasonId: "season-2025-2",
    stats: [
      { memberId: "m1", goals: 4, assists: 3, mvp: 2, attendanceRate: 0.78 },
      { memberId: "m2", goals: 2, assists: 4, mvp: 3, attendanceRate: 0.86 },
      { memberId: "m3", goals: 6, assists: 2, mvp: 1, attendanceRate: 0.72 },
      { memberId: "m4", goals: 0, assists: 1, mvp: 0, attendanceRate: 0.81 },
      { memberId: "m5", goals: 3, assists: 2, mvp: 1, attendanceRate: 0.69 },
    ],
  },
  {
    seasonId: "season-2026-1",
    stats: [
      { memberId: "m1", goals: 5, assists: 4, mvp: 1, attendanceRate: 0.9 },
      { memberId: "m2", goals: 3, assists: 5, mvp: 2, attendanceRate: 0.88 },
      { memberId: "m3", goals: 7, assists: 3, mvp: 2, attendanceRate: 0.84 },
      { memberId: "m4", goals: 1, assists: 1, mvp: 0, attendanceRate: 0.92 },
      { memberId: "m5", goals: 4, assists: 2, mvp: 1, attendanceRate: 0.8 },
    ],
  },
];

export type DemoDuesSetting = {
  id: string;
  memberType: string;
  monthlyAmount: number;
  description: string;
};

export const demoDuesSettings: DemoDuesSetting[] = [
  { id: "ds-1", memberType: "직장인", monthlyAmount: 20000, description: "월 회비 기본" },
  { id: "ds-2", memberType: "학생", monthlyAmount: 15000, description: "학생 할인 적용" },
  { id: "ds-3", memberType: "휴회", monthlyAmount: 5000, description: "장기 결석자 최소 회비" },
];

export type DemoDuesRecord = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  recordedAt: string;
  memberName?: string;
  method?: string;
};

export const demoDuesRecords: DemoDuesRecord[] = [
  {
    id: "dr-1",
    type: "INCOME",
    amount: 20000,
    description: "2월 회비 납부",
    recordedAt: "2026-02-01",
    memberName: "김태훈",
    method: "카카오뱅크",
  },
  {
    id: "dr-2",
    type: "INCOME",
    amount: 15000,
    description: "2월 회비 납부",
    recordedAt: "2026-02-01",
    memberName: "이서연",
    method: "토스",
  },
  {
    id: "dr-3",
    type: "EXPENSE",
    amount: 42000,
    description: "구장 대관 비용",
    recordedAt: "2026-02-02",
    method: "법인카드",
  },
  {
    id: "dr-4",
    type: "EXPENSE",
    amount: 18000,
    description: "음료 및 간식",
    recordedAt: "2026-02-02",
    method: "현금",
  },
];

export type DemoRule = {
  id: string;
  title: string;
  content: string;
  category: "일반" | "회비" | "경조사" | "기타";
  createdAt: string;
  updatedAt: string;
};

export const demoRules: DemoRule[] = [
  {
    id: "rule-1",
    title: "회비 납부 기준",
    content: "매월 5일까지 회비 납부를 원칙으로 하며, 미납 시 운영진에게 사전 공유합니다.",
    category: "회비",
    createdAt: "2025-12-20",
    updatedAt: "2026-01-10",
  },
  {
    id: "rule-2",
    title: "경조사 지원",
    content: "1년 이상 팀 소속 회원 본인 및 직계 가족 경조사 시 5만원 지원합니다.",
    category: "경조사",
    createdAt: "2025-11-15",
    updatedAt: "2025-11-15",
  },
  {
    id: "rule-3",
    title: "출석 규정",
    content: "투표 이후 불참 시 최소 24시간 전에 운영진에게 공유합니다.",
    category: "일반",
    createdAt: "2025-09-08",
    updatedAt: "2026-01-05",
  },
];

export type DemoPost = {
  id: string;
  title: string;
  content: string;
  category: "FREE" | "GALLERY";
  author: string;
  createdAt: string;
  likes: number;
  comments: number;
};

export const demoPosts: DemoPost[] = [
  {
    id: "post-1",
    title: "2/14 경기 유니폼 색상 투표",
    content: "이번 경기에는 네이비 상의를 맞춰 입을까요? 의견 남겨주세요!",
    category: "FREE",
    author: "박민수",
    createdAt: "2026-02-03",
    likes: 6,
    comments: 4,
  },
  {
    id: "post-2",
    title: "2/01 경기 사진 공유",
    content: "경기 사진 업로드했습니다. 하이라이트 컷 확인해주세요.",
    category: "GALLERY",
    author: "이서연",
    createdAt: "2026-02-02",
    likes: 12,
    comments: 7,
  },
  {
    id: "post-3",
    title: "풋살화 공동 구매",
    content: "팀 단체 구매 가능한 브랜드 링크 공유합니다.",
    category: "FREE",
    author: "김태훈",
    createdAt: "2026-01-29",
    likes: 3,
    comments: 2,
  },
];

/* ── 벌금 데모 데이터 ── */
export type DemoPenaltyRule = {
  id: string;
  name: string;
  amount: number;
  description?: string;
};

export const demoPenaltyRules: DemoPenaltyRule[] = [
  { id: "pr-1", name: "무단불참", amount: 10000, description: "사전 연락 없이 경기 불참" },
  { id: "pr-2", name: "지각", amount: 5000, description: "경기 시작 이후 도착" },
  { id: "pr-3", name: "투표 미참여", amount: 3000, description: "마감 기한 내 참석 투표 미완료" },
  { id: "pr-4", name: "유니폼 미착용", amount: 2000, description: "팀 유니폼 미착용" },
];

export type DemoPenaltyRecord = {
  id: string;
  ruleId: string;
  ruleName: string;
  memberId: string;
  memberName: string;
  amount: number;
  date: string;
  isPaid: boolean;
  note?: string;
};

export const demoPenaltyRecords: DemoPenaltyRecord[] = [
  {
    id: "pen-1",
    ruleId: "pr-1",
    ruleName: "무단불참",
    memberId: "m5",
    memberName: "한지우",
    amount: 10000,
    date: "2026-02-01",
    isPaid: false,
    note: "2/1 경기 무단불참",
  },
  {
    id: "pen-2",
    ruleId: "pr-2",
    ruleName: "지각",
    memberId: "m3",
    memberName: "이서연",
    amount: 5000,
    date: "2026-02-01",
    isPaid: true,
  },
  {
    id: "pen-3",
    ruleId: "pr-3",
    ruleName: "투표 미참여",
    memberId: "m4",
    memberName: "정우진",
    amount: 3000,
    date: "2026-02-10",
    isPaid: false,
    note: "2/14 경기 투표 미참여",
  },
];

export type DemoNotification = {
  id: string;
  type: "MATCH" | "VOTE" | "DUES" | "SYSTEM";
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
};

export const demoNotifications: DemoNotification[] = [
  {
    id: "noti-1",
    type: "MATCH",
    title: "2/14 경기 리마인드",
    message: "경기 일정이 일주일 남았습니다. 참석 투표를 완료해주세요.",
    createdAt: "2026-02-07 09:00",
    isRead: false,
  },
  {
    id: "noti-2",
    type: "VOTE",
    title: "MVP 투표 마감 임박",
    message: "2/01 경기 MVP 투표가 오늘 20시에 마감됩니다.",
    createdAt: "2026-02-06 14:20",
    isRead: false,
  },
  {
    id: "noti-3",
    type: "DUES",
    title: "회비 납부 확인",
    message: "2월 회비 납부 내역이 등록되었습니다.",
    createdAt: "2026-02-01 12:00",
    isRead: true,
  },
  {
    id: "noti-4",
    type: "SYSTEM",
    title: "새 시즌 시작",
    message: "2026 상반기 시즌이 시작되었습니다. 개인 기록이 초기화됩니다.",
    createdAt: "2026-01-01 10:00",
    isRead: true,
  },
];
