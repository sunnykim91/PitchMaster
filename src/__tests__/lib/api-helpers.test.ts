import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireRole, apiError, apiSuccess } from "@/lib/api-helpers";
import type { ApiContext } from "@/lib/api-helpers";
import type { Role } from "@/lib/types";

// ─── requireRole ─────────────────────────────────────────────────────────────
describe("requireRole", () => {
  function makeCtx(role: Role): ApiContext {
    return {
      session: { user: { id: "u1", teamId: "t1", teamRole: role } },
      userId: "u1",
      teamId: "t1",
      teamRole: role,
    };
  }

  it("역할이 충분하면 null 반환 (통과)", () => {
    expect(requireRole(makeCtx("PRESIDENT"), "PRESIDENT")).toBeNull();
    expect(requireRole(makeCtx("STAFF"), "MEMBER")).toBeNull();
    expect(requireRole(makeCtx("STAFF"), "STAFF")).toBeNull();
  });

  it("역할이 부족하면 403 응답 반환", async () => {
    const res = requireRole(makeCtx("MEMBER"), "STAFF");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const json = await res!.json();
    expect(json.error).toBe("Insufficient permissions");
  });

  it("MEMBER가 PRESIDENT 권한 요청 → 403", async () => {
    const res = requireRole(makeCtx("MEMBER"), "PRESIDENT");
    expect(res!.status).toBe(403);
  });

  it("STAFF가 PRESIDENT 권한 요청 → 403", async () => {
    const res = requireRole(makeCtx("STAFF"), "PRESIDENT");
    expect(res!.status).toBe(403);
  });
});

// ─── apiError ────────────────────────────────────────────────────────────────
describe("apiError", () => {
  it("기본 상태코드 400", async () => {
    const res = apiError("bad request");
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("bad request");
  });

  it("커스텀 상태코드 지원", async () => {
    const res = apiError("not found", 404);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("not found");
  });

  it("서버 에러 503", async () => {
    const res = apiError("Database not available", 503);
    expect(res.status).toBe(503);
  });
});

// ─── apiSuccess ──────────────────────────────────────────────────────────────
describe("apiSuccess", () => {
  it("기본 상태코드 200", async () => {
    const res = apiSuccess({ matches: [] });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matches).toEqual([]);
  });

  it("생성 성공 201", async () => {
    const data = { id: "new-id", name: "test" };
    const res = apiSuccess(data, 201);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual(data);
  });

  it("null 데이터도 직렬화", async () => {
    const res = apiSuccess(null);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toBeNull();
  });
});
