"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Send, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/lib/ToastContext";

type SendResult = {
  sent: number;
  failed: number;
  timestamp: string;
  title: string;
};

export default function PushTestPage() {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<SendResult[]>([]);

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      showToast("제목과 내용을 입력해주세요.", "error");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url: "/dashboard" }),
      });
      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || "발송에 실패했습니다.", "error");
      } else {
        const msg = result.sent > 0
          ? `${result.sent}명에게 푸시 알림을 보냈습니다.${result.failed ? ` (실패 ${result.failed}건)` : ""}`
          : "푸시 구독된 팀원이 없어 발송하지 못했습니다.";
        showToast(msg, result.sent > 0 ? "success" : "error");
        setHistory((prev) => [
          { sent: result.sent, failed: result.failed, timestamp: new Date().toLocaleTimeString("ko-KR"), title: title.trim() },
          ...prev,
        ]);
        setTitle("");
        setBody("");
      }
    } catch {
      showToast("알림 발송에 실패했습니다.", "error");
    }
    setSending(false);
  }

  return (
    <div className="grid gap-4 stagger-children">
      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-heading text-lg font-bold">푸시 알림 테스트</h1>
              <p className="text-xs text-muted-foreground">전체 팀원에게 푸시 알림을 보냅니다 (운영진 전용)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notice */}
      <div className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 p-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-[hsl(var(--warning))] mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>푸시 알림을 받으려면 팀원이 <strong className="text-foreground">설정 → 푸시 알림 ON</strong> + <strong className="text-foreground">브라우저 알림 허용</strong>을 해야 합니다.</p>
          <p>PWA(홈 화면 추가)로 설치한 경우에만 시스템 알림이 표시됩니다.</p>
        </div>
      </div>

      {/* Send Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            알림 작성
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">제목</label>
            <input
              type="text"
              placeholder="예: 공지사항"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={50}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">내용</label>
            <textarea
              placeholder="알림 내용을 입력하세요"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="text-right text-xs text-muted-foreground">{body.length}/200</p>
          </div>

          {/* Preview */}
          {(title.trim() || body.trim()) && (
            <div className="rounded-xl border border-border/50 bg-secondary/50 p-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">미리보기</p>
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{title || "제목 없음"}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{body || "내용 없음"}</p>
                </div>
              </div>
            </div>
          )}

          <Button
            className="w-full gap-2"
            disabled={sending || !title.trim() || !body.trim()}
            onClick={handleSend}
          >
            {sending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                발송 중...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                전체 팀원에게 알림 보내기
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">발송 내역</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{h.title}</p>
                  <p className="text-xs text-muted-foreground">{h.timestamp}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-[hsl(var(--success))]">{h.sent}명 발송</span>
                  {h.failed > 0 && (
                    <span className="text-xs text-[hsl(var(--loss))]">{h.failed}건 실패</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
