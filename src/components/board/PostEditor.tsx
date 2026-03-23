"use client";

import React, { memo, useRef, useState } from "react";
import Image from "next/image";
import type { FormEvent } from "react";
import { X, BarChart3, Plus, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FormState, PollFormState } from "@/app/(app)/board/BoardClient";

export interface PostEditorProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  pollForm: PollFormState;
  setPollForm: React.Dispatch<React.SetStateAction<PollFormState>>;
  editingPostId: string | null;
  submitting: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  formErrors: Record<string, string>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const PostEditor = memo(function PostEditor({
  form,
  setForm,
  pollForm,
  setPollForm,
  editingPostId,
  submitting,
  onSubmit,
  onCancel,
  formErrors,
  setFormErrors,
}: PostEditorProps) {
  /* ── Image upload state ── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  return (
    <Card className="border-primary/20 shadow-lg animate-in slide-in-from-top-2 duration-200">
      <CardContent className="p-4">
        <form onSubmit={onSubmit} className="space-y-3">
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
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                취소
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
});
