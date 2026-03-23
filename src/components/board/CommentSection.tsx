"use client";

import { memo } from "react";
import { X, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { relativeTime } from "@/lib/utils";
import type { Comment } from "@/app/(app)/board/BoardClient";

export interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  isLoading: boolean;
  isExpanded: boolean;
  userId: string;
  isStaff: boolean;
  commentInput: string;
  onInputChange: (value: string) => void;
  onSubmit: (postId: string) => void;
  onDelete: (commentId: string, postId: string) => void;
  commentingPostId: string | null;
  deletingCommentIds: Set<string>;
  onSetConfirmAction: (action: { message: string; onConfirm: () => void }) => void;
}

export const CommentSection = memo(function CommentSection({
  postId,
  comments,
  isLoading,
  isExpanded,
  userId,
  isStaff,
  commentInput,
  onInputChange,
  onSubmit,
  onDelete,
  commentingPostId,
  deletingCommentIds,
  onSetConfirmAction,
}: CommentSectionProps) {
  if (!isExpanded) return null;

  return (
    <div className="mt-2 space-y-2 animate-in slide-in-from-top-1 duration-150">
      {isLoading && (
        <div className="flex items-center gap-2 py-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      )}

      {comments.length > 0 && (
        <div className="space-y-1.5">
          {comments.map((comment) => {
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
                    aria-label="댓글 삭제"
                    onClick={() => onSetConfirmAction({ message: "댓글을 삭제하시겠습니까?", onConfirm: () => onDelete(comment.id, postId) })}
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
            value={commentInput}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="댓글 작성..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmit(postId);
              }
            }}
          />
          <button
            type="button"
            onClick={() => onSubmit(postId)}
            disabled={commentingPostId === postId || !commentInput?.trim()}
            className="text-primary disabled:text-muted-foreground/40 transition-colors p-0.5"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
