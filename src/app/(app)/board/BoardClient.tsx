"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useApi, apiMutate } from "@/lib/useApi";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Post = {
  id: string;
  title: string;
  content: string;
  category: "FREE" | "GALLERY";
  author: string;
  createdAt: string;
  likes: number;
  comments: number;
  imageUrls?: string[];
};

type Comment = {
  id: string;
  postId: string;
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
    authorName: (raw.author as { name: string })?.name ?? "",
    content: raw.content as string,
    createdAt: (raw.created_at as string)?.slice(0, 10) ?? "",
  };
}

export default function BoardClient({ userId, userName }: { userId: string; userName?: string }) {
  /* ── Data fetching ── */
  const {
    data: postsPayload,
    loading: postsLoading,
    refetch: refetchPosts,
  } = useApi<{ posts: Record<string, unknown>[] }>("/api/posts", { posts: [] });

  const posts: Post[] = useMemo(
    () => postsPayload.posts.map(mapPost),
    [postsPayload],
  );

  /* ── Local UI state ── */
  const [filter, setFilter] = useState<CategoryFilter>("ALL");
  const [form, setForm] = useState({ title: "", content: "", category: "FREE" as Post["category"], imageUrl: "" });
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [likingPostIds, setLikingPostIds] = useState<Set<string>>(new Set());

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
        // Fetch comments if we haven't yet
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

  /* ── Handlers ── */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSubmitting(true);
    try {
      const imageUrls = form.imageUrl.trim() ? [form.imageUrl.trim()] : [];
      await apiMutate("/api/posts", "POST", {
        title: form.title,
        content: form.content,
        category: form.category,
        imageUrls,
      });
      setForm({ title: "", content: "", category: "FREE", imageUrl: "" });
      await refetchPosts();
    } finally {
      setSubmitting(false);
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
    await apiMutate("/api/comments", "POST", { postId, content });
    setCommentInputs({ ...commentInputs, [postId]: "" });
    // Refresh both posts (for comment count) and this post's comments
    await Promise.all([refetchPosts(), fetchComments(postId)]);
  }

  /* ── Loading state ── */
  if (postsLoading && posts.length === 0) {
    return (
      <Card className="p-6">
        <span className="text-muted-foreground">불러오는 중...</span>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
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

      {/* New Post Form */}
      <Card>
        <CardHeader>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">New Post</p>
          <CardTitle className="mt-1 font-heading text-xl font-bold uppercase">
            게시글 작성
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
                      onChange={(event) => setForm({ ...form, title: event.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-content">내용</Label>
                  <Textarea
                    id="post-content"
                    value={form.content}
                    onChange={(event) => setForm({ ...form, content: event.target.value })}
                    required
                    rows={4}
                  />
                </div>
                {form.category === "GALLERY" && (
                  <div className="space-y-2">
                    <Label htmlFor="post-image-url">이미지 URL</Label>
                    <Input
                      id="post-image-url"
                      value={form.imageUrl}
                      onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                    {form.imageUrl && (
                      <img
                        src={form.imageUrl}
                        alt="미리보기"
                        className="mt-2 max-h-40 rounded-xl object-contain"
                      />
                    )}
                  </div>
                )}
                <Button type="submit" className="w-fit" disabled={submitting}>
                  {submitting ? "등록 중..." : "게시글 등록"}
                </Button>
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
          {filteredPosts.map((post) => {
            const postComments = commentsByPost[post.id] ?? [];
            const isExpanded = expandedPostIds.has(post.id);
            const isLoadingComments = loadingComments.has(post.id);
            return (
              <Card key={post.id} className="border-0 bg-secondary">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Badge variant="default">
                        {post.category === "FREE" ? "자유" : "사진"}
                      </Badge>
                      <h4 className="mt-2 text-lg font-bold">{post.title}</h4>
                      <p className="mt-2 text-sm text-muted-foreground">{post.content}</p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {post.author} · {post.createdAt}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleLike(post.id)}
                      disabled={likingPostIds.has(post.id)}
                    >
                      좋아요 {post.likes}
                    </Button>
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
                          {postComments.map((comment) => (
                            <Card key={comment.id} className="border-0 bg-muted/50">
                              <CardContent className="px-3 py-2">
                                <p className="text-xs font-bold">{comment.authorName}</p>
                                <p className="text-sm text-muted-foreground">{comment.content}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{comment.createdAt}</p>
                              </CardContent>
                            </Card>
                          ))}
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
                        >
                          등록
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
