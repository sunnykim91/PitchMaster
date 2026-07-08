import { describe, it, expect } from "vitest";
import {
  isValidMvpVoteTurnout,
  resolveValidMvp,
  resolveValidMvps,
  pickStaffDecision,
  shouldApplyNewMvpPolicy,
  MVP_VOTE_THRESHOLD,
  STAFF_DECISION_POLICY_CUTOFF,
} from "@/lib/mvpThreshold";

// MVP 정책은 9곳(SSR·API·캐시·UI)에 흩어져 있어 한 군데 회귀가 다른 8곳과 어긋날 위험.
// 정책 1줄 변경 시 회귀 잡을 안전망.

describe("isValidMvpVoteTurnout", () => {
  it("참석 체크 미기록(0명) + 표 있으면 폴백 true (옛 데이터 보존)", () => {
    expect(isValidMvpVoteTurnout(3, 0)).toBe(true);
  });

  it("참석 체크 미기록(0명) + 표도 0이면 false", () => {
    expect(isValidMvpVoteTurnout(0, 0)).toBe(false);
  });

  it("참석 10명 + 7표 = 70% → true (임계값 일치)", () => {
    expect(isValidMvpVoteTurnout(7, 10)).toBe(true);
  });

  it("참석 10명 + 6표 = 60% → false (임계값 미달)", () => {
    expect(isValidMvpVoteTurnout(6, 10)).toBe(false);
  });

  it("참석 10명 + 10표 = 100% → true", () => {
    expect(isValidMvpVoteTurnout(10, 10)).toBe(true);
  });

  it("참석 1명 + 1표 = 100% → true (소규모 경기 보호)", () => {
    expect(isValidMvpVoteTurnout(1, 1)).toBe(true);
  });

  it("MVP_VOTE_THRESHOLD 상수 = 0.7 (의도된 임계값)", () => {
    expect(MVP_VOTE_THRESHOLD).toBe(0.7);
  });
});

describe("resolveValidMvp", () => {
  it("운영진 직접 지정(staffDecision) 있으면 투표 무관하게 즉시 확정", () => {
    expect(resolveValidMvp([], 10, "user-staff-pick")).toBe("user-staff-pick");
  });

  it("staffDecision이 다른 최다득표자보다 우선", () => {
    // a=3표 vs staffDecision=z → z 우선
    expect(resolveValidMvp(["a", "a", "a"], 5, "z")).toBe("z");
  });

  it("staffDecision 없고 70% 미달이면 null", () => {
    // 5표 / 10명 참석 = 50% → null
    expect(resolveValidMvp(["a", "a", "a", "b", "b"], 10)).toBeNull();
  });

  it("staffDecision 없고 70% 충족이면 최다득표자 반환", () => {
    // 7표 / 10명 = 70%, b=4 vs a=3 → b
    expect(
      resolveValidMvp(["a", "a", "a", "b", "b", "b", "b"], 10),
    ).toBe("b");
  });

  it("동률일 때 candidate_id 사전순 첫 번째 반환 (결정론적)", () => {
    // a=2, b=2 → 사전순 첫 번째 a
    expect(resolveValidMvp(["b", "a", "b", "a"], 4)).toBe("a");
  });

  it("표 0개 + staffDecision 없음 → null", () => {
    expect(resolveValidMvp([], 10)).toBeNull();
  });

  it("참석 체크 미기록 경기는 폴백으로 단순 최다득표 통과", () => {
    expect(resolveValidMvp(["a", "a", "b"], 0)).toBe("a");
  });
});

describe("resolveValidMvps (공동 MVP)", () => {
  it("단독 1등이면 1명 배열 반환", () => {
    // 7표 / 10명 = 70%, b=4 vs a=3 → [b]
    expect(
      resolveValidMvps(["a", "a", "a", "b", "b", "b", "b"], 10),
    ).toEqual(["b"]);
  });

  it("공동 1등이면 전원 반환 (사전순)", () => {
    // a=2, b=2 동률 → 둘 다 (사전순)
    expect(resolveValidMvps(["b", "a", "b", "a"], 4)).toEqual(["a", "b"]);
  });

  it("3명 공동 1등도 전원 반환", () => {
    expect(resolveValidMvps(["c", "a", "b"], 3)).toEqual(["a", "b", "c"]);
  });

  it("staffDecision 있으면 그 1명만 (공동 적용 안 함)", () => {
    // a=2, b=2 동률이어도 운영진 직접 지정 z 1명만
    expect(resolveValidMvps(["a", "a", "b", "b"], 4, "z")).toEqual(["z"]);
  });

  it("70% 미달이면 빈 배열", () => {
    // 5표 / 10명 = 50% → []
    expect(resolveValidMvps(["a", "a", "a", "b", "b"], 10)).toEqual([]);
  });

  it("표 0개 + staffDecision 없음 → 빈 배열", () => {
    expect(resolveValidMvps([], 10)).toEqual([]);
  });

  it("참석 체크 미기록 경기는 폴백으로 최다득표 통과 (공동 포함)", () => {
    // attendedCount=0 폴백, a=2 단독 → [a]
    expect(resolveValidMvps(["a", "a", "b"], 0)).toEqual(["a"]);
  });
});

describe("pickStaffDecision", () => {
  const VOTER_STAFF = "voter-staff-1";
  const VOTER_MEMBER = "voter-member-1";
  const staffVoters = new Set([VOTER_STAFF]);

  it("is_staff_decision=true row 있으면 그 candidate (백필 치유 무관)", () => {
    const votes = [
      { voter_id: VOTER_MEMBER, candidate_id: "cand-A", is_staff_decision: true },
      { voter_id: VOTER_STAFF, candidate_id: "cand-B", is_staff_decision: false },
    ];
    expect(pickStaffDecision(votes, staffVoters)).toBe("cand-A");
  });

  it("백필 치유 활성(default): 현재 STAFF voter 투표를 staff decision으로 간주", () => {
    // is_staff_decision=true 없지만 voter가 현재 STAFF
    const votes = [
      { voter_id: VOTER_MEMBER, candidate_id: "cand-X", is_staff_decision: false },
      { voter_id: VOTER_STAFF, candidate_id: "cand-Y", is_staff_decision: false },
    ];
    expect(pickStaffDecision(votes, staffVoters)).toBe("cand-Y");
  });

  it("백필 치유 비활성 + is_staff_decision 없으면 null (새 정책 케이스)", () => {
    const votes = [
      { voter_id: VOTER_STAFF, candidate_id: "cand-Y", is_staff_decision: false },
    ];
    expect(
      pickStaffDecision(votes, staffVoters, { applyBackfillHealing: false }),
    ).toBeNull();
  });

  it("백필 치유 비활성이라도 is_staff_decision=true는 staff decision으로 인정", () => {
    const votes = [
      { voter_id: VOTER_STAFF, candidate_id: "cand-Z", is_staff_decision: true },
    ];
    expect(
      pickStaffDecision(votes, staffVoters, { applyBackfillHealing: false }),
    ).toBe("cand-Z");
  });

  it("votes 비어있으면 null", () => {
    expect(pickStaffDecision([], staffVoters)).toBeNull();
  });

  it("staff voter 없고 is_staff_decision도 없으면 null", () => {
    const votes = [
      { voter_id: VOTER_MEMBER, candidate_id: "cand-A", is_staff_decision: false },
    ];
    expect(pickStaffDecision(votes, staffVoters)).toBeNull();
  });
});

describe("pickStaffDecision — preferLatest (최신 지정 = MVP, LATEST_STAFF_MVP_CUTOFF 이후 경기)", () => {
  const S1 = "staff-1", S2 = "staff-2", S3 = "staff-3", S4 = "staff-4";
  const staffVoters = new Set([S1, S2, S3, S4]);

  it("staff 지정 중 created_at 최신 1건이 MVP (최다득표 무시)", () => {
    const votes = [
      { voter_id: S1, candidate_id: "cand-A", is_staff_decision: true, created_at: "2026-07-10T10:00:00Z" },
      { voter_id: S2, candidate_id: "cand-B", is_staff_decision: true, created_at: "2026-07-10T12:00:00Z" }, // 최신
      { voter_id: S3, candidate_id: "cand-C", is_staff_decision: true, created_at: "2026-07-10T11:00:00Z" },
    ];
    expect(pickStaffDecision(votes, staffVoters, { preferLatest: true })).toBe("cand-B");
  });

  it("운영진 4명이 서로 다른 후보 → 가장 마지막에 찍은 사람", () => {
    const votes = [
      { voter_id: S1, candidate_id: "cand-A", is_staff_decision: true, created_at: "2026-07-10T09:00:00Z" },
      { voter_id: S2, candidate_id: "cand-B", is_staff_decision: true, created_at: "2026-07-10T09:30:00Z" },
      { voter_id: S3, candidate_id: "cand-C", is_staff_decision: true, created_at: "2026-07-10T10:15:00Z" }, // 최신
      { voter_id: S4, candidate_id: "cand-D", is_staff_decision: true, created_at: "2026-07-10T10:00:00Z" },
    ];
    expect(pickStaffDecision(votes, staffVoters, { preferLatest: true })).toBe("cand-C");
  });

  it("재투표로 created_at 갱신되면 그 사람으로 MVP 교체", () => {
    const votes = [
      { voter_id: S2, candidate_id: "cand-A", is_staff_decision: true, created_at: "2026-07-10T10:00:00Z" },
      { voter_id: S1, candidate_id: "cand-B", is_staff_decision: true, created_at: "2026-07-10T10:05:00Z" }, // 교체(최신)
    ];
    expect(pickStaffDecision(votes, staffVoters, { preferLatest: true })).toBe("cand-B");
  });

  it("created_at 동시각이면 candidate_id 사전순 tiebreak (결정론적)", () => {
    const votes = [
      { voter_id: S1, candidate_id: "cand-Y", is_staff_decision: true, created_at: "2026-07-10T10:00:00Z" },
      { voter_id: S2, candidate_id: "cand-X", is_staff_decision: true, created_at: "2026-07-10T10:00:00Z" },
    ];
    expect(pickStaffDecision(votes, staffVoters, { preferLatest: true })).toBe("cand-X");
  });

  it("preferLatest=false(과거 경기)면 최다득표 유지 — 최신 무시", () => {
    const votes = [
      { voter_id: S1, candidate_id: "cand-A", is_staff_decision: true, created_at: "2026-07-10T09:00:00Z" },
      { voter_id: S2, candidate_id: "cand-A", is_staff_decision: true, created_at: "2026-07-10T09:30:00Z" },
      { voter_id: S3, candidate_id: "cand-B", is_staff_decision: true, created_at: "2026-07-10T12:00:00Z" }, // 최신이지만
    ];
    expect(pickStaffDecision(votes, staffVoters, { preferLatest: false })).toBe("cand-A"); // 2표 우세
    expect(pickStaffDecision(votes, staffVoters, { preferLatest: true })).toBe("cand-B");  // 최신
  });
});

describe("shouldApplyNewMvpPolicy", () => {
  it("mvp_vote_staff_only=true 면 무조건 옛 정책 (false 반환)", () => {
    expect(shouldApplyNewMvpPolicy("2030-01-01", true)).toBe(false);
  });

  it("matchDate null이면 옛 정책 (false)", () => {
    expect(shouldApplyNewMvpPolicy(null, false)).toBe(false);
    expect(shouldApplyNewMvpPolicy(undefined, false)).toBe(false);
  });

  it(`matchDate < ${STAFF_DECISION_POLICY_CUTOFF} 이면 옛 정책 (5/4 이전 경기 보호)`, () => {
    expect(shouldApplyNewMvpPolicy("2026-05-03", false)).toBe(false);
    expect(shouldApplyNewMvpPolicy("2025-12-31", false)).toBe(false);
  });

  it(`matchDate >= ${STAFF_DECISION_POLICY_CUTOFF} + staff_only=false → 새 정책 (true)`, () => {
    expect(shouldApplyNewMvpPolicy(STAFF_DECISION_POLICY_CUTOFF, false)).toBe(true);
    expect(shouldApplyNewMvpPolicy("2026-06-01", false)).toBe(true);
  });

  it("STAFF_DECISION_POLICY_CUTOFF 상수 = 2026-05-04 (정책 시작일)", () => {
    expect(STAFF_DECISION_POLICY_CUTOFF).toBe("2026-05-04");
  });
});
