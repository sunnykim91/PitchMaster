import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function getBoardData(teamId: string) {
  const db = getSupabaseAdmin();
  if (!db) return { posts: [] };

  const { data } = await db
    .from("posts")
    .select("*, author:author_id(name), post_likes(count), post_comments(count)")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  type PostRow = Record<string, unknown> & {
    post_likes?: { count: number }[];
    post_comments?: { count: number }[];
  };
  const posts = (data ?? []).map((row: PostRow) => ({
    ...row,
    likes_count: row.post_likes?.[0]?.count ?? 0,
    comments_count: row.post_comments?.[0]?.count ?? 0,
  }));

  return { posts };
}
