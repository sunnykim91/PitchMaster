"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import type { FormEvent } from "react";
import { MessageSquare, Heart, Pin, Plus, X, ChevronDown, ChevronUp, BarChart3, Send, ImageIcon, Pencil, Trash2 } from "lucide-react";
import { useApi, apiMutate } from "@/lib/useApi";
import { useToast } from "@/lib/ToastContext";
import { isStaffOrAbove } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ImageLightbox } from "@/components/ImageLightbox";

/* ── Types ── */
type PollOption = { id: string; label: string; votes: number };
type Poll = {
  id: string;
  question: string;
  endsAt: string | null;
  options: PollOption[];
  totalVotes: number;
  myVote: string | null;
};

type Post = {
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

type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

function mapPost(raw: Record<string, unknown>): Post {
  const poll = raw.poll as Record<string, unknown> | null;
  return {
    id: raw.id as string,
    title: raw.title as string,
    content: raw.content as string,
    authorId: raw.author_id as string,
    author: (raw.author as { name: string })?.name ?? "",
    createdAt: (raw.created_at as string)?.slice(0, 10) ?? "",
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
    createdAt: (raw.created_at as string)?.slice(0, 10) ?? "",
  };
}

type FormState = {
  title: string;
  content: string;
  imageUrl: string;
};

type PollFormState = {
  enabled: boolean;
  question: string;
  options: string[];
};

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

  const posts: Post[] = useMemo(
    () => postsPayload.posts.map(mapPost),
    [postsPayload],
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
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
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

  /* ── Image upload state ── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  function toggleExpand(postId: string) {
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
  }

  /* ── Image upload handler ── */
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? "업로드 실패");
      }
      const json = await res.json();
      setForm((prev) => ({ ...prev, imageUrl: (json as { url: string }).url }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  /* ── Poll form helpers ── */
  function addPollOption() {
    if (pollForm.options.length >= 5) return;
    setPollForm((prev) => ({ ...prev, options: [...prev.options, ""] }));
  }

  function removePollOption(index: number) {
    if (pollForm.options.length <= 2) return;
    setPollForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  }

  function updatePollOption(index: number, value: string) {
    setPollForm((prev) => ({
      ...prev,
      options: prev.options.map((o, i) => (i === index ? value : o)),
    }));
  }

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
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refetchPosts();
    } finally {
      setSubmitting(false);
    }
  }

  function handleEditPost(post: Post) {
    setEditingPostId(post.id);
    setForm({
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrls?.[0] ?? "",
    });
    setPollForm(EMPTY_POLL);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingPostId(null);
    setForm(EMPTY_FORM);
    setPollForm(EMPTY_POLL);
    setShowForm(false);
    setUploadError(null);
    setFormErrors({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeletePost(postId: string) {
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
  }

  async function handleDeleteComment(commentId: string, postId: string) {
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
  }

  async function handleLike(postId: string) {
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
  }

  async function handlePin(postId: string) {
    try {
      await apiMutate("/api/posts", "PUT", { id: postId, action: "pin" });
      await refetchPosts();
      showToast("고정 상태가 변경되었습니다.");
    } catch {
      showToast("고정 변경에 실패했습니다.");
    }
  }

  async function handleVote(pollId: string, optionId: string) {
    setVotingOptionId(optionId);
    try {
      await apiMutate("/api/posts/vote", "POST", { pollId, optionId });
      await refetchPosts();
    } finally {
      setVotingOptionId(null);
    }
  }

  async function handleAddComment(postId: string) {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    setCommentingPostId(postId);
    try {
      await apiMutate("/api/comments", "POST", { postId, content });
      setCommentInputs({ ...commentInputs, [postId]: "" });
      await Promise.all([refetchPosts(), fetchComments(postId)]);
      showToast("댓글이 등록되었습니다.");
    } finally {
      setCommentingPostId(null);
    }
  }

  /* ── Relative time ── */
  function relativeTime(dateStr: string) {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "방금";
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}시간 전`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}일 전`;
    return dateStr;
  }

  /* ── Error state ── */
  if (postsError) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-destructive">오류: {postsError}</span>
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
        <h1 className="text-xl font-bold">게시판</h1>
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
        <Card className="border-primary/20 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <h2 className="text-base font-semibold">
                {editingPostId ? "게시글 수정" : "새 글 작성"}
              </h2>

              {/* Title */}
              <div>
                <Input
                  value={form.title}
                  onChange={(e) => { setForm({ ...form, title: e.target.value }); setFormErrors((prev) => ({ ...prev, title: "" })); }}
                  placeholder="제목"
                  className={cn("text-base", formErrors.title && "border-destructive")}
                />
                {formErrors.title && <p className="mt-1 text-xs text-destructive">{formErrors.title}</p>}
              </div>

              {/* Content */}
              <div>
                <Textarea
                  value={form.content}
                  onChange={(e) => { setForm({ ...form, content: e.target.value }); setFormErrors((prev) => ({ ...prev, content: "" })); }}
                  placeholder="내용을 입력하세요"
                  rows={3}
                  className={cn(formErrors.content && "border-destructive")}
                />
                {formErrors.content && <p className="mt-1 text-xs text-destructive">{formErrors.content}</p>}
              </div>

              {/* Image upload */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  {uploading ? "업로드 중..." : "사진 첨부"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleFileChange}
                />
                {uploadError && <span className="text-xs text-destructive">{uploadError}</span>}
              </div>
              {form.imageUrl && !uploading && (
                <div className="relative inline-block">
                  <Image
                    src={form.imageUrl}
                    alt="미리보기"
                    width={200}
                    height={100}
                    className="max-h-32 rounded-lg object-contain"
                    unoptimized
                  />
                  <button
                    type="button"
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, imageUrl: "" }));
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Poll toggle (not available when editing) */}
              {!editingPostId && (
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant={pollForm.enabled ? "secondary" : "outline"}
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setPollForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    {pollForm.enabled ? "투표 제거" : "투표 추가"}
                  </Button>

                  {pollForm.enabled && (
                    <div className="rounded-lg border border-border/50 bg-secondary/50 p-3 space-y-2.5 animate-in slide-in-from-top-1 duration-150">
                      <Input
                        value={pollForm.question}
                        onChange={(e) => setPollForm((prev) => ({ ...prev, question: e.target.value }))}
                        placeholder="투표 질문 (예: 다음 경기 유니폼 색상은?)"
                        className={cn("text-sm", formErrors.pollQuestion && "border-destructive")}
                      />
                      {formErrors.pollQuestion && <p className="text-xs text-destructive">{formErrors.pollQuestion}</p>}

                      <div className="space-y-2">
                        {pollForm.options.map((opt, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                            <Input
                              value={opt}
                              onChange={(e) => updatePollOption(i, e.target.value)}
                              placeholder={`선택지 ${i + 1}`}
                              className="text-sm flex-1"
                            />
                            {pollForm.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removePollOption(i)}
                                className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        {formErrors.pollOptions && <p className="text-xs text-destructive">{formErrors.pollOptions}</p>}
                      </div>

                      {pollForm.options.length < 5 && (
                        <button
                          type="button"
                          onClick={addPollOption}
                          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          선택지 추가
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" size="sm" disabled={submitting || uploading} className="px-6">
                  {submitting ? "등록 중..." : editingPostId ? "수정" : "등록"}
                </Button>
                {editingPostId && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
                    취소
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Post List ── */}
      {posts.length === 0 ? (
        <EmptyState icon={MessageSquare} title="아직 게시글이 없습니다" />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const postComments = commentsByPost[post.id] ?? [];
            const isExpanded = expandedPostIds.has(post.id);
            const isLoadingComments = loadingComments.has(post.id);
            const canModifyPost = post.authorId === userId || isStaff;
            const isPollExpired = post.poll?.endsAt ? new Date(post.poll.endsAt) < new Date() : false;
            const hasVoted = !!post.poll?.myVote;

            return (
              <Card
                key={post.id}
                className={cn(
                  "overflow-hidden transition-colors",
                  post.isPinned && "border-primary/30 bg-primary/[0.03]"
                )}
              >
                <CardContent className="p-4">
                  {/* Post header: author + meta */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Avatar placeholder */}
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {post.author?.charAt(0) || "?"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold truncate">{post.author}</span>
                          {post.isPinned && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 text-primary border-primary/30">
                              <Pin className="h-2.5 w-2.5" />
                              고정
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{relativeTime(post.createdAt)}</p>
                      </div>
                    </div>

                    {/* Actions menu */}
                    {(canModifyPost || isStaff) && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        {isStaff && (
                          <button
                            type="button"
                            onClick={() => handlePin(post.id)}
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              post.isPinned
                                ? "text-primary hover:bg-primary/10"
                                : "text-muted-foreground hover:bg-muted"
                            )}
                            title={post.isPinned ? "고정 해제" : "고정"}
                          >
                            <Pin className="h-4 w-4" />
                          </button>
                        )}
                        {canModifyPost && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditPost(post)}
                              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmAction({ message: "게시글을 삭제하시겠습니까?", onConfirm: () => handleDeletePost(post.id) })}
                              disabled={deletingPostIds.has(post.id)}
                              className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Post body */}
                  <div className="mt-3">
                    <h3 className="text-[15px] font-bold leading-snug">{post.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                      {post.content}
                    </p>
                  </div>

                  {/* Image */}
                  {post.imageUrls && post.imageUrls.length > 0 && (
                    <button
                      type="button"
                      className="mt-3 block w-full cursor-zoom-in"
                      onClick={() => setLightboxSrc(post.imageUrls![0])}
                    >
                      <Image
                        src={post.imageUrls[0]}
                        alt={post.title}
                        width={480}
                        height={240}
                        className="w-full max-h-56 rounded-lg object-cover"
                        unoptimized
                      />
                    </button>
                  )}

                  {/* Poll */}
                  {post.poll && (
                    <div className="mt-3 rounded-lg border border-border/50 bg-secondary/30 p-3 space-y-2.5">
                      <div className="flex items-center gap-1.5">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">{post.poll.question}</span>
                      </div>

                      <div className="space-y-1.5">
                        {post.poll.options.map((option) => {
                          const pct = post.poll!.totalVotes > 0
                            ? Math.round((option.votes / post.poll!.totalVotes) * 100)
                            : 0;
                          const isMyVote = post.poll!.myVote === option.id;
                          const showResults = hasVoted || isPollExpired;

                          return (
                            <button
                              key={option.id}
                              type="button"
                              disabled={isPollExpired || votingOptionId === option.id}
                              onClick={() => handleVote(post.poll!.id, option.id)}
                              className={cn(
                                "relative w-full text-left rounded-lg px-3 py-2.5 text-sm transition-all overflow-hidden",
                                showResults
                                  ? "bg-muted/50"
                                  : "bg-muted/30 hover:bg-muted/60 active:scale-[0.99]",
                                isMyVote && "ring-1 ring-primary/50",
                                isPollExpired && "opacity-70 cursor-default"
                              )}
                            >
                              {/* Result bar */}
                              {showResults && (
                                <div
                                  className={cn(
                                    "absolute inset-y-0 left-0 transition-all duration-500 ease-out rounded-lg",
                                    isMyVote ? "bg-primary/15" : "bg-muted-foreground/8"
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              )}
                              <div className="relative flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {!showResults && (
                                    <div className={cn(
                                      "w-4 h-4 rounded-full border-2 shrink-0",
                                      isMyVote ? "border-primary bg-primary" : "border-muted-foreground/40"
                                    )} />
                                  )}
                                  <span className={cn(
                                    "truncate",
                                    isMyVote && "font-semibold"
                                  )}>
                                    {option.label}
                                  </span>
                                </div>
                                {showResults && (
                                  <span className={cn(
                                    "text-xs shrink-0 tabular-nums",
                                    isMyVote ? "font-bold text-primary" : "text-muted-foreground"
                                  )}>
                                    {pct}%
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{post.poll.totalVotes}명 투표</span>
                        {post.poll.endsAt && (
                          <>
                            <span>&middot;</span>
                            <span>{isPollExpired ? "마감됨" : `${relativeTime(post.poll.endsAt)} 마감`}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer: likes + comments toggle */}
                  <div className="mt-3 flex items-center gap-1 border-t border-border/30 pt-2.5">
                    <button
                      type="button"
                      onClick={() => handleLike(post.id)}
                      disabled={likingPostIds.has(post.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-primary/5"
                    >
                      <Heart className={cn("h-4 w-4", post.likes > 0 && "fill-primary/20 text-primary")} />
                      {post.likes > 0 && <span>{post.likes}</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(post.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {post.comments > 0 && <span>{post.comments}</span>}
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>

                  {/* Comments section */}
                  {isExpanded && (
                    <div className="mt-2 space-y-2 animate-in slide-in-from-top-1 duration-150">
                      {isLoadingComments && (
                        <div className="flex items-center gap-2 py-2">
                          <Skeleton className="h-3 w-3 rounded-full" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      )}

                      {postComments.length > 0 && (
                        <div className="space-y-1.5">
                          {postComments.map((comment) => {
                            const canDeleteComment = comment.authorId === userId || isStaff;
                            return (
                              <div key={comment.id} className="flex items-start gap-2 py-1.5 group">
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-[10px] font-bold text-muted-foreground">
                                    {comment.authorName?.charAt(0) || "?"}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-xs font-semibold">{comment.authorName}</span>
                                    <span className="text-[10px] text-muted-foreground">{relativeTime(comment.createdAt)}</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground leading-snug">{comment.content}</p>
                                </div>
                                {canDeleteComment && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmAction({ message: "댓글을 삭제하시겠습니까?", onConfirm: () => handleDeleteComment(comment.id, post.id) })}
                                    disabled={deletingCommentIds.has(comment.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all shrink-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Comment input */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-primary">나</span>
                        </div>
                        <div className="flex-1 flex items-center gap-1.5 bg-muted/50 rounded-full px-3 py-1">
                          <input
                            type="text"
                            value={commentInputs[post.id] ?? ""}
                            onChange={(e) =>
                              setCommentInputs({ ...commentInputs, [post.id]: e.target.value })
                            }
                            placeholder="댓글 작성..."
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddComment(post.id);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddComment(post.id)}
                            disabled={commentingPostId === post.id || !commentInputs[post.id]?.trim()}
                            className="text-primary disabled:text-muted-foreground/40 transition-colors p-0.5"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.message ?? ""}
        variant="destructive"
        confirmLabel="삭제"
        onConfirm={() => { confirmAction?.onConfirm(); setConfirmAction(null); }}
        onCancel={() => setConfirmAction(null)}
      />

      <ImageLightbox
        src={lightboxSrc}
        onClose={() => setLightboxSrc(null)}
      />
    </div>
  );
}
