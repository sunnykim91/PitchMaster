"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { FormEvent } from "react";
import { MessageSquare, Plus, X } from "lucide-react";
import { useApi, apiMutate } from "@/lib/useApi";
import { useToast } from "@/lib/ToastContext";
import { isStaffOrAbove } from "@/lib/permissions";
import { toKoreanError } from "@/lib/errorMessages";
import type { Role } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ImageLightbox } from "@/components/ImageLightbox";

import { PostCard } from "@/components/board/PostCard";
import { PostEditor } from "@/components/board/PostEditor";

/* ── Exported Types ── */
export type PollOption = { id: string; label: string; votes: number };
export type Poll = {
  id: string;
  question: string;
  endsAt: string | null;
  options: PollOption[];
  totalVotes: number;
  myVote: string | null;
};

export type Post = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author: string;
  createdAt: string;
  likes: number;
  comments: number;
  imageUrls?: string[];
  isPinned: boolean;
  poll: Poll | null;
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type FormState = {
  title: string;
  content: string;
  imageUrl: string;
};

export type PollFormState = {
  enabled: boolean;
  question: string;
  options: string[];
};

function mapPost(raw: Record<string, unknown>): Post {
  const poll = raw.poll as Record<string, unknown> | null;
  return {
    id: raw.id as string,
    title: raw.title as string,
    content: raw.content as string,
    authorId: raw.author_id as string,
    author: (raw.author as { name: string })?.name ?? "",
    createdAt: (raw.created_at as string) ?? "",
    likes: (raw.likes_count as number) ?? 0,
    comments: (raw.comments_count as number) ?? 0,
    imageUrls: (raw.image_urls as string[]) ?? [],
    isPinned: (raw.is_pinned as boolean) ?? false,
    poll: poll
      ? {
          id: poll.id as string,
          question: poll.question as string,
          endsAt: (poll.endsAt as string) ?? null,
          options: (poll.options as PollOption[]) ?? [],
          totalVotes: (poll.totalVotes as number) ?? 0,
          myVote: (poll.myVote as string) ?? null,
        }
      : null,
  };
}

function mapComment(raw: Record<string, unknown>): Comment {
  return {
    id: raw.id as string,
    postId: raw.post_id as string,
    authorId: raw.author_id as string,
    authorName: (raw.author as { name: string })?.name ?? "",
    content: raw.content as string,
    createdAt: (raw.created_at as string) ?? "",
  };
}

const EMPTY_FORM: FormState = { title: "", content: "", imageUrl: "" };
const EMPTY_POLL: PollFormState = { enabled: false, question: "", options: ["", ""] };

type InitialData = { posts: Record<string, unknown>[] };

export default function BoardClient({
  userId,
  userRole,
  initialData,
}: {
  userId: string;
  userRole?: Role;
  initialData?: InitialData;
}) {
  const { showToast } = useToast();
  const isStaff = isStaffOrAbove(userRole);

  /* ── Data fetching ── */
  const {
    data: postsPayload,
    loading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = useApi<{ posts: Record<string, unknown>[] }>(
    "/api/posts",
    initialData ?? { posts: [] },
    { skip: !!initialData },
  );

  const rawPosts: Post[] = useMemo(
    () => postsPayload.posts.map(mapPost),
    [postsPayload],
  );

  // Optimistic 투표 오버라이드 (pollId → 변경된 Poll)
  const [optimisticPolls, setOptimisticPolls] = useState<Record<string, Poll>>({});

  const posts: Post[] = useMemo(
    () => rawPosts.map((p) =>
      p.poll && optimisticPolls[p.poll.id]
        ? { ...p, poll: optimisticPolls[p.poll.id] }
        : p
    ),
    [rawPosts, optimisticPolls],
  );

  /* ── Local UI state ── */
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pollForm, setPollForm] = useState<PollFormState>(EMPTY_POLL);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [likingPostIds, setLikingPostIds] = useState<Set<string>>(new Set());
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [deletingPostIds, setDeletingPostIds] = useState<Set<string>>(new Set());
  const [deletingCommentIds, setDeletingCommentIds] = useState<Set<string>>(new Set());
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  /* ── Escape key: cancel edit ── */
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancelEdit();
    };
    if (editingPostId || showForm) {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [editingPostId, showForm]);

  /* ── 작성 중 이탈 경고 ── */
  useEffect(() => {
    const hasContent = form.title.trim() || form.content.trim();
    if (!hasContent) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [form.title, form.content]);

  /* ── Per-post comments ── */
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(new Set());
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());

  const fetchComments = useCallback(async (postId: string) => {
    setLoadingComments((prev) => new Set(prev).add(postId));
    try {
      const res = await fetch(`/api/comments?postId=${postId}`);
      if (res.ok) {
        const json = await res.json();
        const mapped = (json.comments as Record<string, unknown>[]).map(mapComment);
        setCommentsByPost((prev) => ({ ...prev, [postId]: mapped }));
      }
    } finally {
      setLoadingComments((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  }, []);

  const toggleExpand = useCallback((postId: string) => {
    setExpandedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
        if (!commentsByPost[postId]) {
          fetchComments(postId);
        }
      }
      return next;
    });
  }, [commentsByPost, fetchComments]);

  /* ── Submit (create or update) ── */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "제목을 입력해주세요.";
    if (!form.content.trim()) errors.content = "내용을 입력해주세요.";
    if (pollForm.enabled) {
      if (!pollForm.question.trim()) errors.pollQuestion = "투표 질문을 입력해주세요.";
      const validOptions = pollForm.options.filter((o) => o.trim());
      if (validOptions.length < 2) errors.pollOptions = "최소 2개의 선택지가 필요합니다.";
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSubmitting(true);
    try {
      const imageUrls = form.imageUrl.trim() ? [form.imageUrl.trim()] : [];
      if (editingPostId) {
        await apiMutate("/api/posts", "PUT", {
          id: editingPostId,
          title: form.title,
          content: form.content,
          imageUrls,
        });
        showToast("게시글이 수정되었습니다.");
        setEditingPostId(null);
      } else {
        const body: Record<string, unknown> = {
          title: form.title,
          content: form.content,
          imageUrls,
        };
        if (pollForm.enabled) {
          body.poll = {
            question: pollForm.question,
            options: pollForm.options.filter((o) => o.trim()),
          };
        }
        await apiMutate("/api/posts", "POST", body);
        showToast("게시글이 등록되었습니다.");
      }
      setForm(EMPTY_FORM);
      setPollForm(EMPTY_POLL);
      setShowForm(false);
      await refetchPosts();
    } finally {
      setSubmitting(false);
    }
  }

  const handleEditPost = useCallback((post: Post) => {
    setEditingPostId(post.id);
    setForm({
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrls?.[0] ?? "",
    });
    setPollForm(EMPTY_POLL);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  function handleCancelEdit() {
    setEditingPostId(null);
    setForm(EMPTY_FORM);
    setPollForm(EMPTY_POLL);
    setShowForm(false);
    setFormErrors({});
  }

  const handleDeletePost = useCallback(async (postId: string) => {
    setDeletingPostIds((prev) => new Set(prev).add(postId));
    try {
      await apiMutate("/api/posts", "DELETE", { id: postId });
      await refetchPosts();
      showToast("게시글이 삭제되었습니다.");
    } finally {
      setDeletingPostIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  }, [refetchPosts, showToast]);

  const handleDeleteComment = useCallback(async (commentId: string, postId: string) => {
    setDeletingCommentIds((prev) => new Set(prev).add(commentId));
    try {
      await apiMutate("/api/comments", "DELETE", { id: commentId });
      await Promise.all([refetchPosts(), fetchComments(postId)]);
      showToast("댓글이 삭제되었습니다.");
    } finally {
      setDeletingCommentIds((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  }, [refetchPosts, fetchComments, showToast]);

  const handleLike = useCallback(async (postId: string) => {
    setLikingPostIds((prev) => new Set(prev).add(postId));
    try {
      await apiMutate("/api/posts/like", "POST", { postId });
      await refetchPosts();
    } finally {
      setLikingPostIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  }, [refetchPosts]);

  const handlePin = useCallback(async (postId: string) => {
    try {
      await apiMutate("/api/posts", "PUT", { id: postId, action: "pin" });
      await refetchPosts();
      showToast("고정 상태가 변경되었습니다.");
    } catch {
      showToast("고정 변경에 실패했습니다.");
    }
  }, [refetchPosts, showToast]);

  const handleVote = useCallback(async (pollId: string, optionId: string) => {
    // 현재 poll 찾기
    const post = posts.find((p) => p.poll?.id === pollId);
    if (!post?.poll) return;
    const poll = optimisticPolls[pollId] ?? post.poll;
    const prevVote = poll.myVote;
    const isSameOption = prevVote === optionId;

    // Optimistic UI: 즉시 반영
    const newOptions = poll.options.map((opt) => {
      let votes = opt.votes;
      if (prevVote === opt.id) votes--;
      if (!isSameOption && opt.id === optionId) votes++;
      return { ...opt, votes: Math.max(0, votes) };
    });
    setOptimisticPolls((prev) => ({
      ...prev,
      [pollId]: {
        ...poll,
        options: newOptions,
        totalVotes: newOptions.reduce((s, o) => s + o.votes, 0),
        myVote: isSameOption ? null : optionId,
      },
    }));

    // 백그라운드 API 호출
    try {
      const { error: voteErr } = await apiMutate("/api/posts/vote", "POST", { pollId, optionId });
      if (voteErr) {
        showToast("투표에 실패했습니다.", "error");
        setOptimisticPolls((prev) => { const n = { ...prev }; delete n[pollId]; return n; });
      }
      await refetchPosts();
      setOptimisticPolls((prev) => { const n = { ...prev }; delete n[pollId]; return n; });
    } catch {
      showToast("투표에 실패했습니다.", "error");
      setOptimisticPolls((prev) => { const n = { ...prev }; delete n[pollId]; return n; });
      await refetchPosts();
    }
  }, [posts, optimisticPolls, refetchPosts]);

  const handleShare = useCallback(async (post: Post) => {
    const url = `${window.location.origin}/board`;
    const title = post.title;
    const text = post.poll
      ? `📊 ${post.poll.question}\n${post.poll.options.map((o) => `• ${o.label}`).join("\n")}`
      : post.content.slice(0, 100);

    // Web Share API 시도
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // 취소 등 무시
      }
    }

    // fallback: 클립보드 복사
    const shareText = `${title}\n${text}\n\n${url}`;
    await navigator.clipboard.writeText(shareText);
    showToast("게시글 링크가 복사되었습니다.");
  }, [showToast]);

  const handleAddComment = useCallback(async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    setCommentingPostId(postId);
    try {
      await apiMutate("/api/comments", "POST", { postId, content });
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      await Promise.all([refetchPosts(), fetchComments(postId)]);
      showToast("댓글이 등록되었습니다.");
    } finally {
      setCommentingPostId(null);
    }
  }, [commentInputs, refetchPosts, fetchComments, showToast]);

  /* ── Error state ── */
  if (postsError) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-destructive">오류: {toKoreanError(postsError)}</span>
          <Button variant="outline" size="sm" onClick={refetchPosts}>다시 시도</Button>
        </div>
      </Card>
    );
  }

  /* ── Loading state ── */
  if (postsLoading && posts.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg sm:text-2xl font-bold uppercase">게시판</h1>
        <Button
          size="sm"
          className="rounded-full gap-1.5"
          onClick={() => {
            if (showForm) {
              handleCancelEdit();
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "닫기" : "글쓰기"}
        </Button>
      </div>

      {/* ── Write Form (collapsible) ── */}
      {showForm && (
        <PostEditor
          form={form}
          setForm={setForm}
          pollForm={pollForm}
          setPollForm={setPollForm}
          editingPostId={editingPostId}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={handleCancelEdit}
          formErrors={formErrors}
          setFormErrors={setFormErrors}
        />
      )}

      {/* ── Post List ── */}
      {posts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="아직 게시글이 없습니다"
          description="첫 글을 작성해보세요."
          action={
            <Button size="sm" onClick={() => setShowForm(true)}>
              글쓰기
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userId={userId}
              isStaff={isStaff}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
              onLike={handleLike}
              onPin={handlePin}
              onImageClick={setLightboxSrc}
              onVote={handleVote}
              onShare={handleShare}
              onToggleExpand={toggleExpand}
              likingPostIds={likingPostIds}
              deletingPostIds={deletingPostIds}
              votingOptionId={votingOptionId}
              comments={commentsByPost[post.id] ?? []}
              isExpanded={expandedPostIds.has(post.id)}
              isLoadingComments={loadingComments.has(post.id)}
              commentInput={commentInputs[post.id] ?? ""}
              onCommentInputChange={(value) =>
                setCommentInputs((prev) => ({ ...prev, [post.id]: value }))
              }
              onCommentSubmit={handleAddComment}
              onCommentDelete={handleDeleteComment}
              commentingPostId={commentingPostId}
              deletingCommentIds={deletingCommentIds}
            />
          ))}
        </div>
      )}

      <ImageLightbox
        src={lightboxSrc}
        onClose={() => setLightboxSrc(null)}
      />
    </div>
  );
}
