import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signSession, verifySession, isSessionSigningConfigured } from "@/lib/sessionSign";

const ORIGINAL_SECRET = process.env.SESSION_SECRET;

describe("sessionSign", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret-at-least-sixteen-chars-long";
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = ORIGINAL_SECRET;
  });

  it("signs and verifies a payload round-trip", () => {
    const payload = JSON.stringify({ user: { id: "abc", name: "kim" } });
    const signed = signSession(payload);
    expect(signed).not.toBeNull();
    expect(signed).toContain(".");
    const recovered = verifySession(signed!);
    expect(recovered).toBe(payload);
  });

  it("rejects a payload whose signature was tampered with", () => {
    const payload = JSON.stringify({ user: { id: "abc" } });
    const signed = signSession(payload)!;
    // 시그니처 부분만 한 글자 바꿈
    const [p, sig] = signed.split(".");
    const tampered = `${p}.${sig.slice(0, -1)}${sig.slice(-1) === "A" ? "B" : "A"}`;
    expect(verifySession(tampered)).toBeNull();
  });

  it("rejects a payload whose body was tampered with", () => {
    const payload = JSON.stringify({ user: { id: "victim" } });
    const signed = signSession(payload)!;
    const [, sig] = signed.split(".");
    // base64url로 인코딩된 공격자 payload를 붙여넣음
    const attacker = Buffer.from(JSON.stringify({ user: { id: "attacker" } }), "utf8").toString("base64url");
    const tampered = `${attacker}.${sig}`;
    expect(verifySession(tampered)).toBeNull();
  });

  it("rejects a cookie signed with a different secret", () => {
    const payload = JSON.stringify({ user: { id: "abc" } });
    const signed = signSession(payload)!;
    process.env.SESSION_SECRET = "different-secret-also-long-enough";
    expect(verifySession(signed)).toBeNull();
  });

  it("rejects malformed cookie strings", () => {
    expect(verifySession("")).toBeNull();
    expect(verifySession("no-dot-at-all")).toBeNull();
    expect(verifySession(".leading-dot")).toBeNull();
    expect(verifySession("trailing-dot.")).toBeNull();
    expect(verifySession("....")).toBeNull();
  });

  it("returns null when SESSION_SECRET is missing", () => {
    delete process.env.SESSION_SECRET;
    expect(isSessionSigningConfigured()).toBe(false);
    expect(signSession("any")).toBeNull();
    expect(verifySession("any.thing")).toBeNull();
  });

  it("returns null when SESSION_SECRET is too short", () => {
    process.env.SESSION_SECRET = "short";
    expect(isSessionSigningConfigured()).toBe(false);
    expect(signSession("any")).toBeNull();
  });
});
