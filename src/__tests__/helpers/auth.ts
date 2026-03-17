import type { Session } from "@/lib/types";

/** 기본 테스트 세션 (MEMBER 권한) */
export const memberSession: Session = {
  user: {
    id: "user-member-001",
    name: "일반 멤버",
    teamId: "team-test-001",
    teamRole: "MEMBER",
  },
};

/** STAFF 권한 세션 */
export const staffSession: Session = {
  user: {
    id: "user-staff-001",
    name: "운영진",
    teamId: "team-test-001",
    teamRole: "STAFF",
  },
};

/** PRESIDENT 권한 세션 */
export const presidentSession: Session = {
  user: {
    id: "user-president-001",
    name: "회장",
    teamId: "team-test-001",
    teamRole: "PRESIDENT",
  },
};

/** 팀 없는 세션 */
export const noTeamSession: Session = {
  user: {
    id: "user-noteam-001",
    name: "팀 없는 유저",
  },
};
