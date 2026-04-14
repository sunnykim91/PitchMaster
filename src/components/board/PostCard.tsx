"use client";

import { memo } from "react";
import Image from "next/image";
import { MessageSquare, Heart, Pin, ChevronDown, ChevronUp, Pencil, Trash2, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/utils";
import { PollBlock } from "@/components/board/PollBlock";
import { CommentSection } from "@/components/board/CommentSection";
import { useConfirm } from "@/lib/ConfirmContext";
import type { Post, Comment } from "@/app/(app)/board/BoardClient";

export interface PostCardProps {
  post: Post;
  userId: string;
  isStaff: boolean;
  onEdit: (post: Post) => void;
  onDelete: (postId: string) => void;
  onLike: (postId: string) => void;
  onPin: (postId: string) => void;
  onImageClick: (src: string) => void;
  onVote: (pollId: string, optionId: string) => void;
  onClosePoll?: (pollId: string) => void;
  onShare: (post: Post) => void;
  onToggleExpand: (postId: string) => void;
  likingPostIds: Set<string>;
  deletingPostIds: Set<string>;
  votingOptionId: string | null;
  /* Comment-related props */
  comments: Comment[];
  isExpanded: boolean;
  isLoadingComments: boolean;
  commentInput: string;
  onCommentInputChange: (value: string) => void;
  onCommentSubmit: (postId: string) => void;
  onCommentDelete: (commentId: string, postId: string) => void;
  commentingPostId: string | null;
  deletingCommentIds: Set<string>;
}

export const PostCard = memo(function PostCard({
  post,
  userId,
  isStaff,
  onEdit,
  onDelete,
  onLike,
  onPin,
  onImageClick,
  onVote,
  onClosePoll,
  onShare,
  onToggleExpand,
  likingPostIds,
  deletingPostIds,
  votingOptionId,
  comments,
  isExpanded,
  isLoadingComments,
  commentInput,
  onCommentInputChange,
  onCommentSubmit,
  onCommentDelete,
  commentingPostId,
  deletingCommentIds,
}: PostCardProps) {
  const confirm = useConfirm();
  const canModifyPost = post.authorId === userId || isStaff;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-colors",
        post.isPinned && "border-primary/30 bg-primary/[0.06]"
      )}
    >
      <CardContent className="p-4">
        {/* Post header: author + meta */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Avatar */}
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-border">
              {post.authorProfileImage ? (
                <img src={post.authorProfileImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-primary">
                  {post.author?.charAt(0) || "?"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold truncate">{post.author}</span>
                {post.isPinned && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 gap-0.5 text-primary border-primary/30">
                    <Pin className="h-2.5 w-2.5" />
                    고정
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{relativeTime(post.createdAt)}</p>
            </div>
          </div>

          {/* Actions menu */}
          {(canModifyPost || isStaff) && (
            <div className="flex items-center gap-1 shrink-0">
              {isStaff && (
                <button
                  type="button"
                  onClick={() => onPin(post.id)}
                  className={cn(
                    "p-2.5 rounded-md transition-colors active:scale-95",
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
                    onClick={() => onEdit(post)}
                    className="p-2.5 rounded-md text-muted-foreground hover:bg-muted transition-colors active:scale-95"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({ title: "게시글을 삭제할까요?", variant: "destructive", confirmLabel: "삭제" });
                      if (ok) onDelete(post.id);
                    }}
                    disabled={deletingPostIds.has(post.id)}
                    className="p-2.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-95"
                  >
                    <Trash2 className="h-4 w-4" />
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
            onClick={() => onImageClick(post.imageUrls![0])}
          >
            <Image
              src={post.imageUrls[0]}
              alt={post.title}
              width={480}
              height={240}
              className="w-full max-h-56 rounded-lg object-cover bg-secondary animate-pulse"
              onLoad={(e) => (e.currentTarget.classList.remove("animate-pulse", "bg-secondary"))}
            />
          </button>
        )}

        {/* Poll */}
        {post.poll && (
          <PollBlock
            poll={post.poll}
            onVote={onVote}
            onClosePoll={onClosePoll}
            isStaff={isStaff}
            votingOptionId={votingOptionId}
          />
        )}

        {/* Footer: likes + comments toggle */}
        <div className="mt-3 flex items-center gap-1 border-t border-border/30 pt-2.5">
          <button
            type="button"
            onClick={() => onLike(post.id)}
            disabled={likingPostIds.has(post.id)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-md hover:bg-primary/5 active:scale-95"
          >
            <Heart className={cn("h-4 w-4", post.likes > 0 && "fill-primary/20 text-primary")} />
            {post.likes > 0 && <span>{post.likes}</span>}
          </button>

          <button
            type="button"
            onClick={() => onToggleExpand(post.id)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-muted active:scale-95"
          >
            <MessageSquare className="h-4 w-4" />
            {post.comments > 0 && <span>{post.comments}</span>}
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <button
            type="button"
            onClick={() => onShare(post)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-muted active:scale-95 ml-auto"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {/* Comments section */}
        <CommentSection
          postId={post.id}
          comments={comments}
          isLoading={isLoadingComments}
          isExpanded={isExpanded}
          userId={userId}
          isStaff={isStaff}
          commentInput={commentInput}
          onInputChange={onCommentInputChange}
          onSubmit={onCommentSubmit}
          onDelete={onCommentDelete}
          commentingPostId={commentingPostId}
          deletingCommentIds={deletingCommentIds}
        />
      </CardContent>
    </Card>
  );
});
