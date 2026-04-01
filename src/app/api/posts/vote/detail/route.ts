import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** 투표 상세 조회 — 누가 어디에 투표했는지 + 미투표자 */
export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const pollId = request.nextUrl.searchParams.get("pollId");
  if (!pollId) return apiError("pollId required");

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // 투표 소속 팀 확인
  const { data: poll } = await db
    .from("post_polls")
    .select("id, post_id")
    .eq("id", pollId)
    .single();
  if (!poll) return apiError("Poll not found", 404);

  const { data: post } = await db
    .from("posts")
    .select("team_id")
    .eq("id", poll.post_id)
    .single();
  if (!post || post.team_id !== ctx.teamId) return apiError("Forbidden", 403);

  // 옵션 목록
  const { data: options } = await db
    .from("post_poll_options")
    .select("id, label, sort_order")
    .eq("poll_id", pollId)
    .order("sort_order");

  // 투표한 사람들
  const { data: votes } = await db
    .from("post_poll_votes")
    .select("option_id, user_id, users(name)")
    .eq("poll_id", pollId);

  // 팀 전체 활성 멤버
  const { data: members } = await db
    .from("team_members")
    .select("user_id, users(name)")
    .eq("team_id", ctx.teamId)
    .eq("status", "ACTIVE")
    .not("user_id", "is", null);

  // 옵션별 투표자 매핑
  const optionVoters: Record<string, { name: string }[]> = {};
  const votedUserIds = new Set<string>();

  for (const opt of options ?? []) {
    optionVoters[opt.id] = [];
  }
  for (const v of votes ?? []) {
    const user = Array.isArray(v.users) ? v.users[0] : v.users;
    const name = (user as { name: string } | null)?.name ?? "알 수 없음";
    if (!optionVoters[v.option_id]) optionVoters[v.option_id] = [];
    optionVoters[v.option_id].push({ name });
    votedUserIds.add(v.user_id);
  }

  // 미투표자
  const notVoted: { name: string }[] = [];
  for (const m of members ?? []) {
    if (m.user_id && !votedUserIds.has(m.user_id)) {
      const user = Array.isArray(m.users) ? m.users[0] : m.users;
      const name = (user as { name: string } | null)?.name ?? "알 수 없음";
      notVoted.push({ name });
    }
  }

  return apiSuccess({
    options: (options ?? []).map((o) => ({
      id: o.id,
      label: o.label,
      voters: optionVoters[o.id] ?? [],
    })),
    notVoted,
    totalMembers: members?.length ?? 0,
    totalVoted: votedUserIds.size,
  });
}
