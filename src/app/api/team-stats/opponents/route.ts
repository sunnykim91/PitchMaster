import { NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * 우리 팀이 과거에 상대했던 상대팀 이름 목록 (빈도순·중복 제거).
 * 일정 생성·수정 폼의 상대팀 입력 자동완성 chip 용.
 *
 * GET /api/team-stats/opponents  →  { opponents: string[] }
 *
 * REGULAR(상대전) 경기만 집계 — INTERNAL(자체전)은 상대팀이 없고,
 * EVENT(팀 행사)는 opponent_name 이 "연말 회식" 같은 제목이라 제외.
 * match_type 이 null 인 레거시 경기는 상대전으로 간주(전적 로직과 동일).
 * 역할 게이트 없음(의도) — 팀 스코프 데이터라 /team-stats/opponent 와 동일하게 MEMBER+ 공개.
 */
export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data } = await db
    .from("matches")
    .select("opponent_name, match_type")
    .eq("team_id", ctx.teamId)
    .not("opponent_name", "is", null);

  type Row = { opponent_name: string | null; match_type: string | null };
  const rows = (data ?? []) as Row[];

  // 빈도 집계 (REGULAR·레거시 null 만)
  const counts = new Map<string, number>();
  for (const r of rows) {
    const matchType = r.match_type ?? "REGULAR";
    if (matchType !== "REGULAR") continue;
    const name = r.opponent_name?.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const opponents = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);

  return apiSuccess({ opponents });
}
