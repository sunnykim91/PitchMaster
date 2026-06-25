"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Send, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/ToastContext";
import { useConfirm } from "@/lib/ConfirmContext";
import { apiMutate } from "@/lib/useApi";
import { formatKstDateTime } from "@/lib/formatters";

export type GlobalNoticeRow = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  teamId: string;
};

type Props = { recent: GlobalNoticeRow[] };

export default function AdminNoticeClient({ recent: initialRecent }: Props) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [recent, setRecent] = useState(initialRecent);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 미저장 운영공지 작성 중 페이지 이탈 경고
  useEffect(() => {
    if (!title.trim() && !content.trim()) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [title, content]);

  async function handleSubmit() {
    if (!title.trim() || !content.trim()) {
      showToast("제목과 내용을 모두 입력해주세요.", "error");
      return;
    }
    const ok = await confirm({
      title: "모든 팀에 노출되는 운영공지를 발행할까요?",
      description: `제목: ${title.trim()}`,
      confirmLabel: "발행",
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      const { data, error } = await apiMutate<{ id: string; created_at: string }>("/api/posts", "POST", {
        title,
        content,
        category: "FREE",
        isGlobal: true,
        imageUrls: [],
      });
      if (error || !data) {
        showToast(error ?? "발행에 실패했습니다.", "error");
        return;
      }
      showToast("운영공지가 발행되었습니다.");
      setTitle("");
      setContent("");
      setRecent((prev) => [
        { id: data.id, title, content, createdAt: data.created_at ?? new Date().toISOString(), teamId: "" },
        ...prev,
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, noticeTitle: string) {
    const ok = await confirm({
      title: "운영공지를 삭제할까요?",
      description: noticeTitle,
      variant: "destructive",
      confirmLabel: "삭제",
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      const { error } = await apiMutate("/api/posts", "DELETE", { id });
      if (error) {
        showToast(error, "error");
        return;
      }
      setRecent((prev) => prev.filter((r) => r.id !== id));
      showToast("삭제되었습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          홈
        </Link>
        <h1 className="ml-2 text-base font-bold">운영공지 관리</h1>
        <span className="ml-auto rounded-full bg-[hsl(var(--warning)_/_0.15)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--warning))]">
          PitchMaster 운영자 전용
        </span>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">새 운영공지 작성</CardTitle>
          <p className="text-xs text-muted-foreground">
            발행하면 PitchMaster를 쓰는 <span className="font-semibold text-foreground">모든 팀의 홈/게시판 상단</span>에 노출됩니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목 (예: v1.0.5 업데이트 안내)"
            maxLength={200}
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            rows={5}
            maxLength={10000}
          />
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !content.trim()}
            className="w-full gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? "발행 중..." : "운영공지 발행"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">최근 운영공지</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">아직 발행한 운영공지가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((r) => (
                <div key={r.id} className="flex items-start gap-2 rounded-md bg-[hsl(var(--secondary)_/_0.3)] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{r.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">{r.content}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {formatKstDateTime(r.createdAt, { withYear: true })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id, r.title)}
                    disabled={deletingId === r.id}
                    className="p-2 rounded-md text-muted-foreground hover:bg-[hsl(var(--destructive)_/_0.1)] hover:text-destructive transition-colors active:scale-95 disabled:opacity-50"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
