import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isStaffOrAbove } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const query = db
    .from("posts")
    .select(
      "*, author:author_id(name), post_likes(count), post_comments(count)"
    )
    .eq("team_id", ctx.teamId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) return apiError(error.message);

  // Supabase returns aggregated counts as [{ count: N }] — flatten
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

  // Fetch polls for these posts
  let polls: Record<string, unknown>[] = [];
  if (postIds.length > 0) {
    const { data: pollData } = await db
      .from("post_polls")
      .select("*, post_poll_options(id, label, sort_order)")
      .in("post_id", postIds);
    polls = pollData ?? [];
  }

  // Fetch vote counts per option
  const pollIds = polls.map((p) => (p as { id: string }).id);
  let voteCounts: Record<string, number> = {};
  let userVotes: Record<string, string> = {}; // pollId -> optionId
  if (pollIds.length > 0) {
    const { data: voteData } = await db
      .from("post_poll_votes")
      .select("poll_id, option_id")
      .in("poll_id", pollIds);

    // Count votes per option
    for (const v of voteData ?? []) {
      const optId = (v as { option_id: string }).option_id;
      voteCounts[optId] = (voteCounts[optId] ?? 0) + 1;
      if ((v as { user_id?: string }).user_id === ctx.userId) {
        userVotes[(v as { poll_id: string }).poll_id] = optId;
      }
    }

    // Also check current user's votes
    const { data: myVotes } = await db
      .from("post_poll_votes")
      .select("poll_id, option_id")
      .in("poll_id", pollIds)
      .eq("user_id", ctx.userId);
    for (const v of myVotes ?? []) {
      userVotes[(v as { poll_id: string }).poll_id] = (v as { option_id: string }).option_id;
    }
  }

  // Attach poll data to posts
  const pollByPostId = new Map<string, Record<string, unknown>>();
  for (const p of polls) {
    const poll = p as { id: string; post_id: string; question: string; ends_at: string | null; post_poll_options: { id: string; label: string; sort_order: number }[] };
    const options = (poll.post_poll_options ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((o) => ({
        id: o.id,
        label: o.label,
        votes: voteCounts[o.id] ?? 0,
      }));
    const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
    pollByPostId.set(poll.post_id, {
      id: poll.id,
      question: poll.question,
      endsAt: poll.ends_at,
      options,
      totalVotes,
      myVote: userVotes[poll.id] ?? null,
    });
  }

  const enrichedPosts = posts.map((post) => ({
    ...post,
    poll: pollByPostId.get(post.id as string) ?? null,
  }));

  return apiSuccess({ posts: enrichedPosts });
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { data, error } = await db
    .from("posts")
    .insert({
      team_id: ctx.teamId,
      author_id: ctx.userId,
      title: body.title,
      content: body.content,
      category: "FREE",
      image_urls: body.imageUrls || [],
    })
    .select()
    .single();

  if (error) return apiError(error.message);

  // Create poll if provided
  if (body.poll && body.poll.question && body.poll.options?.length >= 2) {
    const { data: pollData, error: pollError } = await db
      .from("post_polls")
      .insert({
        post_id: data.id,
        question: body.poll.question,
        ends_at: body.poll.endsAt || null,
      })
      .select()
      .single();

    if (!pollError && pollData) {
      const options = (body.poll.options as string[]).map((label: string, i: number) => ({
        poll_id: pollData.id,
        label,
        sort_order: i,
      }));
      await db.from("post_poll_options").insert(options);
    }
  }

  return apiSuccess(data, 201);
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;
  const db = getSupabaseAdmin();
  if (!db) return apiError("DB unavailable", 503);

  const body = await request.json();
  const { id, title, content, imageUrls } = body;
  if (!id) return apiError("Missing id", 400);

  // Handle pin toggle separately
  if (body.action === "pin") {
    if (!isStaffOrAbove(ctx.teamRole)) return apiError("Forbidden", 403);
    const { data: post } = await db.from("posts").select("is_pinned").eq("id", id).eq("team_id", ctx.teamId).single();
    if (!post) return apiError("Post not found", 404);
    const newPinned = !post.is_pinned;
    const { error } = await db.from("posts").update({
      is_pinned: newPinned,
      pinned_at: newPinned ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) return apiError(error.message, 500);
    return apiSuccess({ ok: true, is_pinned: newPinned });
  }

  // Check ownership (scoped to team)
  const { data: post } = await db.from("posts").select("author_id").eq("id", id).eq("team_id", ctx.teamId).single();
  if (!post) return apiError("Post not found", 404);

  // Author or staff can edit
  const isAuthor = post.author_id === ctx.userId;
  const isStaff = isStaffOrAbove(ctx.teamRole);
  if (!isAuthor && !isStaff) return apiError("Forbidden", 403);

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (imageUrls !== undefined) updateData.image_urls = imageUrls;
  updateData.updated_at = new Date().toISOString();

  const { error } = await db.from("posts").update(updateData).eq("id", id);
  if (error) return apiError(error.message, 500);

  return apiSuccess({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;
  const db = getSupabaseAdmin();
  if (!db) return apiError("DB unavailable", 503);

  const { id } = await request.json();
  if (!id) return apiError("Missing id", 400);

  const { data: post } = await db.from("posts").select("author_id").eq("id", id).eq("team_id", ctx.teamId).single();
  if (!post) return apiError("Post not found", 404);

  const isAuthor = post.author_id === ctx.userId;
  const isStaff = isStaffOrAbove(ctx.teamRole);
  if (!isAuthor && !isStaff) return apiError("Forbidden", 403);

  // FK CASCADE로 댓글/좋아요/투표 자동 삭제
  const { error } = await db.from("posts").delete().eq("id", id);
  if (error) return apiError(error.message, 500);

  return apiSuccess({ ok: true });
}
