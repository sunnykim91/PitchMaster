import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function getBoardData(teamId: string, userId?: string) {
  const db = getSupabaseAdmin();
  if (!db) return { posts: [] };

  const { data } = await db
    .from("posts")
    .select("*, author:author_id(name), post_likes(count), post_comments(count)")
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

  // Fetch polls
  let pollByPostId: Record<string, Record<string, unknown>> = {};
  if (postIds.length > 0) {
    const { data: pollData } = await db
      .from("post_polls")
      .select("*, post_poll_options(id, label, sort_order)")
      .in("post_id", postIds);

    const pollIds = (pollData ?? []).map((p) => (p as { id: string }).id);

    let voteCounts: Record<string, number> = {};
    let userVotes: Record<string, string> = {}; // pollId → optionId
    if (pollIds.length > 0) {
      const { data: voteData } = await db
        .from("post_poll_votes")
        .select("poll_id, option_id, user_id")
        .in("poll_id", pollIds);
      for (const v of voteData ?? []) {
        const optId = (v as { option_id: string }).option_id;
        voteCounts[optId] = (voteCounts[optId] ?? 0) + 1;
        if (userId && (v as { user_id: string }).user_id === userId) {
          userVotes[(v as { poll_id: string }).poll_id] = optId;
        }
      }
    }

    for (const p of pollData ?? []) {
      const poll = p as { id: string; post_id: string; question: string; ends_at: string | null; post_poll_options: { id: string; label: string; sort_order: number }[] };
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
        myVote: userVotes[poll.id] ?? null,
      };
    }
  }

  const enrichedPosts = posts.map((post) => ({
    ...post,
    poll: pollByPostId[post.id as string] ?? null,
  }));

  return { posts: enrichedPosts };
}
