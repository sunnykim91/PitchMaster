import { describe, it, expect } from "vitest";
import {
  scrubAbsentFromPositions,
  removePlayerFromPositions,
  type SquadPosition,
} from "@/lib/server/squadCleanup";

const valid = new Set(["keep1", "keep2", "keep3"]);

describe("scrubAbsentFromPositions — 빠진 인원 전술판 정리", () => {
  it("유효한 선수는 그대로 둔다", () => {
    const pos: Record<string, SquadPosition> = { s1: { playerId: "keep1", x: 10, y: 20 } };
    const { positions, removed } = scrubAbsentFromPositions(pos, valid);
    expect(removed).toBe(0);
    expect(positions.s1).toEqual({ playerId: "keep1", x: 10, y: 20 });
  });

  it("빠진 선수가 단독으로 있는 슬롯은 비운다", () => {
    const pos: Record<string, SquadPosition> = { s1: { playerId: "gone", x: 1, y: 2 } };
    const { positions, removed } = scrubAbsentFromPositions(pos, valid);
    expect(removed).toBe(1);
    expect(positions.s1).toBeNull();
  });

  it("전반이 빠지고 후반이 유효하면 후반을 전반으로 승격한다", () => {
    const pos: Record<string, SquadPosition> = {
      s1: { playerId: "gone", x: 5, y: 6, secondPlayerId: "keep2" },
    };
    const { positions, removed } = scrubAbsentFromPositions(pos, valid);
    expect(removed).toBe(1);
    expect(positions.s1).toEqual({ playerId: "keep2", x: 5, y: 6 });
  });

  it("후반만 빠지면 secondPlayerId 만 제거하고 전반은 유지한다", () => {
    const pos: Record<string, SquadPosition> = {
      s1: { playerId: "keep1", x: 5, y: 6, secondPlayerId: "gone" },
    };
    const { positions, removed } = scrubAbsentFromPositions(pos, valid);
    expect(removed).toBe(1);
    expect(positions.s1).toEqual({ playerId: "keep1", x: 5, y: 6 });
  });

  it("전·후반 모두 빠지면 슬롯을 비운다", () => {
    const pos: Record<string, SquadPosition> = {
      s1: { playerId: "gone1", x: 5, y: 6, secondPlayerId: "gone2" },
    };
    const { positions, removed } = scrubAbsentFromPositions(pos, valid);
    expect(removed).toBe(1);
    expect(positions.s1).toBeNull();
  });

  it("메타 슬롯(__referee 등)은 빠진 인원이어도 건드리지 않는다", () => {
    const pos: Record<string, SquadPosition> = {
      __referee: { playerId: "gone", x: 0, y: 0 },
      __camera: { playerId: "gone2", x: 0, y: 0 },
    };
    const { positions, removed } = scrubAbsentFromPositions(pos, valid);
    expect(removed).toBe(0);
    expect(positions.__referee).toEqual({ playerId: "gone", x: 0, y: 0 });
  });

  it("null 슬롯·빈 입력은 그대로 통과한다", () => {
    expect(scrubAbsentFromPositions({}, valid)).toEqual({ positions: {}, removed: 0 });
    const pos: Record<string, SquadPosition> = { s1: null };
    const { positions, removed } = scrubAbsentFromPositions(pos, valid);
    expect(removed).toBe(0);
    expect(positions.s1).toBeNull();
  });

  it("여러 슬롯이 섞여 있어도 빠진 인원만 정리하고 나머지는 보존한다", () => {
    const pos: Record<string, SquadPosition> = {
      s1: { playerId: "keep1", x: 1, y: 1 },
      s2: { playerId: "gone", x: 2, y: 2 },
      s3: { playerId: "keep2", x: 3, y: 3, secondPlayerId: "keep3" },
      __referee: { playerId: "gone", x: 0, y: 0 },
    };
    const { positions, removed } = scrubAbsentFromPositions(pos, valid);
    expect(removed).toBe(1);
    expect(positions.s1).toEqual({ playerId: "keep1", x: 1, y: 1 });
    expect(positions.s2).toBeNull();
    expect(positions.s3).toEqual({ playerId: "keep2", x: 3, y: 3, secondPlayerId: "keep3" });
    expect(positions.__referee).toEqual({ playerId: "gone", x: 0, y: 0 });
  });
});

describe("removePlayerFromPositions — 특정 1명만 제거 (용병 삭제용)", () => {
  it("지정한 선수만 비우고 나머지는 모두 유지한다", () => {
    const pos: Record<string, SquadPosition> = {
      s1: { playerId: "del", x: 1, y: 1 },
      s2: { playerId: "other", x: 2, y: 2 },
    };
    const { positions, removed } = removePlayerFromPositions(pos, "del");
    expect(removed).toBe(1);
    expect(positions.s1).toBeNull();
    expect(positions.s2).toEqual({ playerId: "other", x: 2, y: 2 });
  });

  it("지정 선수가 후반이면 secondPlayerId만 제거한다", () => {
    const pos: Record<string, SquadPosition> = {
      s1: { playerId: "keep", x: 1, y: 1, secondPlayerId: "del" },
    };
    const { positions, removed } = removePlayerFromPositions(pos, "del");
    expect(removed).toBe(1);
    expect(positions.s1).toEqual({ playerId: "keep", x: 1, y: 1 });
  });

  it("메타 슬롯·없는 선수는 건드리지 않는다", () => {
    const pos: Record<string, SquadPosition> = {
      __referee: { playerId: "del", x: 0, y: 0 },
      s1: { playerId: "someone", x: 1, y: 1 },
    };
    const { positions, removed } = removePlayerFromPositions(pos, "del");
    expect(removed).toBe(0);
    expect(positions.__referee).toEqual({ playerId: "del", x: 0, y: 0 });
    expect(positions.s1).toEqual({ playerId: "someone", x: 1, y: 1 });
  });
});
