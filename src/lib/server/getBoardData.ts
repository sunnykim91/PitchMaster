import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * 게시판 SSR 데이터 fetch — 2단계 병렬화 (2026-05-05).
 *
 * 변경:
 *   posts → polls → poll_options → votes 4단 직렬 → 2단으로 축소.
 *   - Stage 1: posts (post_id 셋 결정)
 *   - Stage 2: polls(+options nested) + votes 동시. votes 는 post_id 셋만 알면 polls 없이도 한 번에 가능
 */
export async function getBoardData(teamId: string, userId?: string) {
  const db = getSupabaseAdmin();
  if (!db) return { posts: [] };

  // ── Stage 1: posts (likes/comments count 포함) ──
  const { data } = await db
    .from("posts")
    .select("*, author:author_id(name, profile_image_url), post_likes(count), post_comments(count)")
    .eq("team_id", teamId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  type PostRow = Record<string, unknown> & {
    post_likes?: { count: number }[];
    post_comments?: { count: number }[];
  };
  const rows = (data ?? []) as PostRow[];
  const postIds = rows.map((r) => r.id as string);
  const posts = rows.map((row) => ({
    ...row,
    id: row.id as string,
    likes_count: row.post_likes?.[0]?.count ?? 0,
    comments_count: row.post_comments?.[0]?.count ?? 0,
  }));

  if (postIds.length === 0) {
    return { posts };
  }

  // ── Stage 2: polls + options + votes 한 쿼리에 nested ──
  // 이전: posts → polls → poll_options → votes 4단 직렬
  // 이제: post_polls 한 번에 options + votes 까지 nested fetch (1 DB round-trip)
  const { data: pollData } = await db
    .from("post_polls")
    .select("*, post_poll_options(id, label, sort_order), post_poll_votes(poll_id, option_id, user_id)")
    .in("post_id", postIds);

  const pollByPostId: Record<string, Record<string, unknown>> = {};
  for (const p of pollData ?? []) {
    const poll = p as {
      id: string;
      post_id: string;
      question: string;
      ends_at: string | null;
      post_poll_options: { id: string; label: string; sort_order: number }[];
      post_poll_votes: { poll_id: string; option_id: string; user_id: string }[];
    };
    const voteCounts: Record<string, number> = {};
    let myVote: string | null = null;
    for (const v of poll.post_poll_votes ?? []) {
      voteCounts[v.option_id] = (voteCounts[v.option_id] ?? 0) + 1;
      if (userId && v.user_id === userId) myVote = v.option_id;
    }
    const options = (poll.post_poll_options ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((o) => ({
        id: o.id,
        label: o.label,
        votes: voteCounts[o.id] ?? 0,
      }));
    const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
    pollByPostId[poll.post_id] = {
      id: poll.id,
      question: poll.question,
      endsAt: poll.ends_at,
      options,
      totalVotes,
      myVote,
    };
  }

  const enrichedPosts = posts.map((post) => ({
    ...post,
    poll: pollByPostId[post.id as string] ?? null,
  }));

  return { posts: enrichedPosts };
}
