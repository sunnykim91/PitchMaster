"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Send, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/lib/ToastContext";
import { cn } from "@/lib/utils";

type SendResult = {
  sent: number;
  failed: number;
  timestamp: string;
  title: string;
  target: string;
};

type TargetUser = {
  id: string;
  name: string;
};

const TARGET_USERS: TargetUser[] = [
  { id: "7bc8a1b2-7844-41f3-b592-05a2c38f8085", name: "김선휘" },
  { id: "76d2f722-7996-4b6e-b4ba-908e50762552", name: "김윤식" },
];

export default function PushTestPage() {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<SendResult[]>([]);
  const [targetMode, setTargetMode] = useState<"all" | "select">("all");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  function toggleUser(userId: string) {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      showToast("제목과 내용을 입력해주세요.", "error");
      return;
    }
    if (targetMode === "select" && selectedUsers.length === 0) {
      showToast("발송 대상을 선택해주세요.", "error");
      return;
    }
    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        body: body.trim(),
        url: "/dashboard",
      };
      if (targetMode === "select") {
        payload.userIds = selectedUsers;
      }
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || "발송에 실패했습니다.", "error");
      } else {
        const targetLabel = targetMode === "all"
          ? "전체"
          : selectedUsers.map((id) => TARGET_USERS.find((u) => u.id === id)?.name).join(", ");
        const msg = result.sent > 0
          ? `${result.sent}명에게 푸시 알림을 보냈습니다.${result.failed ? ` (실패 ${result.failed}건)` : ""}`
          : "푸시 구독된 대상이 없어 발송하지 못했습니다.";
        showToast(msg, result.sent > 0 ? "success" : "error");
        setHistory((prev) => [
          { sent: result.sent, failed: result.failed, timestamp: new Date().toLocaleTimeString("ko-KR"), title: title.trim(), target: targetLabel },
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
              <p className="text-xs text-muted-foreground">팀원에게 푸시 알림을 보냅니다 (운영진 전용)</p>
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
          {/* Target Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">발송 대상</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setTargetMode("all"); setSelectedUsers([]); }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                  targetMode === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                전체 팀원
              </button>
              <button
                type="button"
                onClick={() => setTargetMode("select")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                  targetMode === "select"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                특정 인원
              </button>
            </div>
            {targetMode === "select" && (
              <div className="flex flex-wrap gap-2 mt-1">
                {TARGET_USERS.map((user) => {
                  const isSelected = selectedUsers.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all active:scale-95",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      <div className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      {user.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

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
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">미리보기</p>
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
            disabled={sending || !title.trim() || !body.trim() || (targetMode === "select" && selectedUsers.length === 0)}
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
                {targetMode === "all"
                  ? "전체 팀원에게 알림 보내기"
                  : `${selectedUsers.length}명에게 알림 보내기`}
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
                  <p className="text-xs text-muted-foreground">{h.timestamp} · {h.target}</p>
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
      {/* 알림 지원 조건 안내 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
            푸시 알림 지원 조건
          </CardTitle>
          <p className="text-xs text-muted-foreground">팀원에게 안내할 때 참고하세요</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Android */}
          <div>
            <p className="text-sm font-semibold mb-2">안드로이드</p>
            <div className="space-y-1.5">
              {[
                { browser: "Chrome", ok: true, note: "홈 화면 추가 + 알림 허용" },
                { browser: "삼성 인터넷", ok: true, note: "홈 화면 추가 + 알림 허용" },
                { browser: "카카오톡 내 브라우저", ok: false, note: "PWA 미지원" },
                { browser: "네이버/인스타 등 인앱", ok: false, note: "PWA 미지원" },
              ].map((item) => (
                <div key={item.browser} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                  <span className="text-sm">{item.browser}</span>
                  <span className={cn("text-xs font-semibold", item.ok ? "text-[hsl(var(--success))]" : "text-[hsl(var(--loss))]")}>
                    {item.ok ? "지원" : "불가"} · {item.note}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* iOS */}
          <div>
            <p className="text-sm font-semibold mb-2">아이폰 (iOS)</p>
            <div className="space-y-1.5">
              {[
                { cond: "iOS 16.4+ Safari → 홈 화면 추가", ok: true },
                { cond: "iOS 16.3 이하", ok: false },
                { cond: "Safari 브라우저 (홈 추가 안 함)", ok: false },
                { cond: "Chrome / 카카오톡 / 네이버", ok: false },
              ].map((item) => (
                <div key={item.cond} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                  <span className="text-sm">{item.cond}</span>
                  <span className={cn("text-xs font-semibold", item.ok ? "text-[hsl(var(--success))]" : "text-[hsl(var(--loss))]")}>
                    {item.ok ? "지원" : "불가"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 필수 조건 */}
          <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
            <p className="text-xs font-bold text-muted-foreground mb-2">팀원 안내 사항 (필수 3단계)</p>
            <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
              <li><strong className="text-foreground">홈 화면에 추가</strong> (PWA 설치)</li>
              <li><strong className="text-foreground">브라우저 알림 권한 허용</strong></li>
              <li><strong className="text-foreground">앱 설정 → 푸시 알림 ON</strong></li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
