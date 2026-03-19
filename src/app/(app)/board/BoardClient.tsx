"use client";

import { useRef, useMemo, useState } from "react";
import Image from "next/image";
import type { FormEvent } from "react";
import { useApi, apiMutate } from "@/lib/useApi";
import { useToast } from "@/lib/ToastContext";
import { isStaffOrAbove } from "@/lib/permissions";
import type { Role } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type Post = {
  id: string;
  title: string;
  content: string;
  category: "FREE" | "GALLERY";
  authorId: string;
  author: string;
  createdAt: string;
  likes: number;
  comments: number;
  imageUrls?: string[];
};

type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

type CategoryFilter = "ALL" | "FREE" | "GALLERY";

/** Map a raw API post (snake_case) to our client-side Post shape */
function mapPost(raw: Record<string, unknown>): Post {
  return {
    id: raw.id as string,
    title: raw.title as string,
    content: raw.content as string,
    category: raw.category as "FREE" | "GALLERY",
    authorId: raw.author_id as string,
    author: (raw.author as { name: string })?.name ?? "",
    createdAt: (raw.created_at as string)?.slice(0, 10) ?? "",
    likes: (raw.likes_count as number) ?? 0,
    comments: (raw.comments_count as number) ?? 0,
    imageUrls: (raw.image_urls as string[]) ?? [],
  };
}

/** Map a raw API comment (snake_case) to our client-side Comment shape */
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
  category: Post["category"];
  imageUrl: string;
};

const EMPTY_FORM: FormState = { title: "", content: "", category: "FREE", imageUrl: "" };

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
  const [filter, setFilter] = useState<CategoryFilter>("ALL");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [likingPostIds, setLikingPostIds] = useState<Set<string>>(new Set());
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [deletingPostIds, setDeletingPostIds] = useState<Set<string>>(new Set());
  const [deletingCommentIds, setDeletingCommentIds] = useState<Set<string>>(new Set());
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null);
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null);

  /* ── Image upload state ── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /* ── Per-post comments ── */
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(new Set());
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());

  async function fetchComments(postId: string) {
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
  }

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

  /* ── Derived data ── */
  const filteredPosts = useMemo(() => {
    const list = filter === "ALL" ? posts : posts.filter((post) => post.category === filter);
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [filter, posts]);

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

  /* ── Submit (create or update) ── */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "제목을 입력해주세요.";
    if (!form.content.trim()) errors.content = "내용을 입력해주세요.";
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
          category: form.category,
          imageUrls,
        });
        showToast("게시글이 수정되었습니다.");
        setEditingPostId(null);
      } else {
        await apiMutate("/api/posts", "POST", {
          title: form.title,
          content: form.content,
          category: form.category,
          imageUrls,
        });
        showToast("게시글이 등록되었습니다.");
      }
      setForm(EMPTY_FORM);
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
      category: post.category,
      imageUrl: post.imageUrls?.[0] ?? "",
    });
    // Scroll form into view
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingPostId(null);
    setForm(EMPTY_FORM);
    setUploadError(null);
    setFormErrors({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeletePost(postId: string) {
    setConfirmDeletePostId(null);
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
    setConfirmDeleteCommentId(null);
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
      <div className="grid gap-5">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-0">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-8 w-12" />
            </div>
          </CardHeader>
        </Card>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-0 bg-secondary">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-5 stagger-children">
      {/* Header + Filter */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-0">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-orange-400">Board</p>
            <CardTitle className="mt-1 font-heading text-2xl font-bold uppercase">
              게시판
            </CardTitle>
          </div>
          <div className="flex gap-2">
            {(["ALL", "FREE", "GALLERY"] as CategoryFilter[]).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={filter === value ? "default" : "outline"}
                onClick={() => setFilter(value)}
              >
                {value === "ALL" ? "전체" : value === "FREE" ? "자유" : "사진"}
              </Button>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* New / Edit Post Form */}
      <Card>
        <CardHeader>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            {editingPostId ? "Edit Post" : "New Post"}
          </p>
          <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
            {editingPostId ? "게시글 수정" : "게시글 작성"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Card className="border-0 bg-secondary">
              <CardContent className="grid gap-4 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="post-category">카테고리</Label>
                    <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value as Post["category"] })}>
                      <SelectTrigger id="post-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FREE">자유게시판</SelectItem>
                        <SelectItem value="GALLERY">사진 갤러리</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="post-title">제목</Label>
                    <Input
                      id="post-title"
                      value={form.title}
                      onChange={(event) => { setForm({ ...form, title: event.target.value }); setFormErrors((prev) => ({ ...prev, title: "" })); }}
                      required
                      className={formErrors.title ? "border-destructive" : ""}
                    />
                    {formErrors.title && <p className="text-xs text-destructive">{formErrors.title}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-content">내용</Label>
                  <Textarea
                    id="post-content"
                    value={form.content}
                    onChange={(event) => { setForm({ ...form, content: event.target.value }); setFormErrors((prev) => ({ ...prev, content: "" })); }}
                    required
                    rows={4}
                    className={formErrors.content ? "border-destructive" : ""}
                  />
                  {formErrors.content && <p className="text-xs text-destructive">{formErrors.content}</p>}
                </div>
                {form.category === "GALLERY" && (
                  <div className="space-y-2">
                    <Label htmlFor="post-image-file">이미지 업로드</Label>
                    <input
                      ref={fileInputRef}
                      id="post-image-file"
                      type="file"
                      accept="image/*"
                      className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
                      disabled={uploading}
                      onChange={handleFileChange}
                    />
                    {uploading && (
                      <p className="text-xs text-muted-foreground">업로드 중...</p>
                    )}
                    {uploadError && (
                      <p className="text-xs text-destructive">{uploadError}</p>
                    )}
                    {form.imageUrl && !uploading && (
                      <Image
                        src={form.imageUrl}
                        alt="미리보기"
                        width={320}
                        height={160}
                        className="mt-2 max-h-40 rounded-xl object-contain"
                        unoptimized
                      />
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="submit" className="w-fit" disabled={submitting || uploading}>
                    {submitting ? (editingPostId ? "수정 중..." : "등록 중...") : (editingPostId ? "게시글 수정" : "게시글 등록")}
                  </Button>
                  {editingPostId && (
                    <Button type="button" variant="outline" className="w-fit" onClick={handleCancelEdit}>
                      취소
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </form>
        </CardContent>
      </Card>

      {/* Post List */}
      <Card>
        <CardHeader>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Recent</p>
          <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
            최근 게시글
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredPosts.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              해당 카테고리에 게시글이 없습니다.
            </div>
          ) : (
            filteredPosts.map((post) => {
              const postComments = commentsByPost[post.id] ?? [];
              const isExpanded = expandedPostIds.has(post.id);
              const isLoadingComments = loadingComments.has(post.id);
              const canModifyPost = post.authorId === userId || isStaff;
              return (
                <Card key={post.id} className="border-0 bg-secondary">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <Badge variant="default">
                          {post.category === "FREE" ? "자유" : "사진"}
                        </Badge>
                        <h4 className="mt-2 text-lg font-bold">{post.title}</h4>
                        <p className="mt-2 text-sm text-muted-foreground">{post.content}</p>
                        {post.imageUrls && post.imageUrls.length > 0 && (
                          <Image
                            src={post.imageUrls[0]}
                            alt={post.title}
                            width={480}
                            height={192}
                            className="mt-3 max-h-48 rounded-xl object-contain"
                            unoptimized
                          />
                        )}
                        <p className="mt-3 text-xs text-muted-foreground">
                          {post.author} · {post.createdAt}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleLike(post.id)}
                          disabled={likingPostIds.has(post.id)}
                        >
                          좋아요 {post.likes}
                        </Button>
                        {canModifyPost && (
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => handleEditPost(post)}
                            >
                              수정
                            </Button>
                            {confirmDeletePostId === post.id ? (
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  className="text-xs h-7 px-2"
                                  onClick={() => handleDeletePost(post.id)}
                                  disabled={deletingPostIds.has(post.id)}
                                >
                                  삭제
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 px-2"
                                  onClick={() => setConfirmDeletePostId(null)}
                                >
                                  취소
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 px-2 text-destructive hover:text-destructive"
                                onClick={() => setConfirmDeletePostId(post.id)}
                                disabled={deletingPostIds.has(post.id)}
                              >
                                {deletingPostIds.has(post.id) ? "삭제 중..." : "삭제"}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mt-3 text-xs text-muted-foreground hover:underline"
                      onClick={() => toggleExpand(post.id)}
                    >
                      댓글 {post.comments}개 {isExpanded ? "접기" : "보기"}
                    </button>

                    {isExpanded && (
                      <>
                        {isLoadingComments && (
                          <p className="mt-2 text-xs text-muted-foreground">댓글 불러오는 중...</p>
                        )}

                        {postComments.length > 0 && (
                          <div className="mt-3 space-y-2 border-t border-border pt-3">
                            {postComments.map((comment) => {
                              const canDeleteComment = comment.authorId === userId || isStaff;
                              return (
                                <Card key={comment.id} className="border-0 bg-muted/50">
                                  <CardContent className="px-3 py-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold">{comment.authorName}</p>
                                        <p className="text-sm text-muted-foreground">{comment.content}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{comment.createdAt}</p>
                                      </div>
                                      {canDeleteComment && (
                                        confirmDeleteCommentId === comment.id ? (
                                          <div className="flex gap-1 shrink-0">
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="destructive"
                                              className="text-xs h-6 px-2"
                                              onClick={() => handleDeleteComment(comment.id, post.id)}
                                              disabled={deletingCommentIds.has(comment.id)}
                                            >
                                              삭제
                                            </Button>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              className="text-xs h-6 px-2"
                                              onClick={() => setConfirmDeleteCommentId(null)}
                                            >
                                              취소
                                            </Button>
                                          </div>
                                        ) : (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs h-6 px-2 text-destructive hover:text-destructive shrink-0"
                                            onClick={() => setConfirmDeleteCommentId(comment.id)}
                                            disabled={deletingCommentIds.has(comment.id)}
                                          >
                                            {deletingCommentIds.has(comment.id) ? "..." : "삭제"}
                                          </Button>
                                        )
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}

                        <div className="mt-3 flex gap-2">
                          <Input
                            type="text"
                            value={commentInputs[post.id] ?? ""}
                            onChange={(event) =>
                              setCommentInputs({ ...commentInputs, [post.id]: event.target.value })
                            }
                            placeholder="댓글을 입력하세요..."
                            className="flex-1 text-xs"
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handleAddComment(post.id);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAddComment(post.id)}
                            disabled={commentingPostId === post.id}
                          >
                            등록
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
