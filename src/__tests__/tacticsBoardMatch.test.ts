import { describe, it, expect } from "vitest";
import { isPositionMatched } from "@/components/TacticsBoard.utils";
import type { Player } from "@/components/TacticsBoard.types";

/**
 * 전술판 "적합"(초록) 판정 = 정확 일치.
 * 슬롯 role(RCB/LCB/LM 등)과 선수 포지션 모두 sub-position(CB/LW 등)으로 정규화해 비교.
 * roster.preferredPositions 는 "감독지정 우선(없으면 선호)"로 구성되므로,
 * 여기 preferredPositions 에 담긴 값이 곧 감독지정(있으면) 또는 선호(없으면).
 */
function player(prefs?: string[], role = "MF"): Player {
  return {
    id: "p1",
    name: "테스트",
    role: role as Player["role"],
    preferredPositions: prefs as Player["preferredPositions"],
  };
}

describe("isPositionMatched — 정확 일치", () => {
  it("좌우/변형 슬롯은 같은 포지션으로 정규화해 일치 (CB ↔ RCB/LCB)", () => {
    expect(isPositionMatched(player(["CB"]), "RCB")).toBe(true);
    expect(isPositionMatched(player(["CB"]), "LCB")).toBe(true);
    expect(isPositionMatched(player(["CB"]), "CB")).toBe(true);
  });

  it("같은 카테고리(수비)라도 포지션이 다르면 불일치 (CB 선수의 LB 슬롯)", () => {
    expect(isPositionMatched(player(["CB"]), "LB")).toBe(false);
    expect(isPositionMatched(player(["CB"]), "RB")).toBe(false);
  });

  it("미드 세부 포지션 구분 (CM ≠ CDM ≠ CAM)", () => {
    expect(isPositionMatched(player(["CM"]), "LCM")).toBe(true);
    expect(isPositionMatched(player(["CM"]), "CDM")).toBe(false);
    expect(isPositionMatched(player(["CDM"]), "RDM")).toBe(true);
    expect(isPositionMatched(player(["CAM"]), "CM")).toBe(false);
  });

  it("윙 좌우 구분 (LW ↔ LM/LAM, RW 슬롯은 불일치)", () => {
    expect(isPositionMatched(player(["LW"]), "LM")).toBe(true);
    expect(isPositionMatched(player(["LW"]), "LAM")).toBe(true);
    expect(isPositionMatched(player(["LW"]), "RW")).toBe(false);
    expect(isPositionMatched(player(["LW"]), "RM")).toBe(false);
  });

  it("스트라이커 변형 슬롯 (ST ↔ CF/RS/LS)", () => {
    expect(isPositionMatched(player(["ST"]), "CF")).toBe(true);
    expect(isPositionMatched(player(["ST"]), "RS")).toBe(true);
    expect(isPositionMatched(player(["ST"]), "LW")).toBe(false);
  });

  it("GK", () => {
    expect(isPositionMatched(player(["GK"]), "GK")).toBe(true);
    expect(isPositionMatched(player(["GK"]), "CB")).toBe(false);
  });

  it("풋살 포지션 (FIXO/ALA/PIVO)", () => {
    expect(isPositionMatched(player(["FIXO"]), "FIXO")).toBe(true);
    expect(isPositionMatched(player(["ALA"]), "PIVO")).toBe(false);
  });

  it("복수 포지션 중 하나라도 정확히 일치하면 적합", () => {
    expect(isPositionMatched(player(["CB", "ST"]), "ST")).toBe(true);
    expect(isPositionMatched(player(["CB", "ST"]), "CM")).toBe(false);
  });

  it("preferredPositions 없으면 role 로 폴백", () => {
    expect(isPositionMatched(player(undefined, "ST"), "CF")).toBe(true);
    expect(isPositionMatched(player(undefined, "ST"), "CB")).toBe(false);
    expect(isPositionMatched(player([], "CB"), "RCB")).toBe(true);
  });

  it("player 없으면 false", () => {
    expect(isPositionMatched(null, "CB")).toBe(false);
    expect(isPositionMatched(undefined, "CB")).toBe(false);
  });
});
