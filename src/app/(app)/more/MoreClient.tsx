"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Bell, BookOpen, Settings, ExternalLink, Smartphone, HelpCircle, LogOut } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const menuItems = [
  { href: "/members", label: "회원 관리", desc: "멤버 목록 · 역할 관리", icon: Users, color: "text-[hsl(var(--success))]" },
  { href: "/board", label: "게시판", desc: "공지 · 자유 게시판", icon: MessageSquare, color: "text-primary" },
  { href: "/notifications", label: "알림", desc: "알림 센터", icon: Bell, color: "text-[hsl(var(--warning))]" },
  { href: "/rules", label: "회칙", desc: "팀 규정 관리", icon: BookOpen, color: "text-[hsl(var(--accent))]" },
  { href: "/settings", label: "설정", desc: "프로필 · 팀 설정", icon: Settings, color: "text-muted-foreground" },
  { href: "/guide.html", label: "사용 가이드", desc: "기능 안내 · FAQ", icon: HelpCircle, color: "text-[hsl(var(--info))]" },
];

const roleLabels: Record<string, string> = {
  PRESIDENT: "회장",
  STAFF: "운영진",
  MEMBER: "회원",
};

export default function MoreClient({
  userName,
  teamName,
  teamRole,
  profileImageUrl,
}: {
  userName: string;
  teamName: string;
  teamRole: string;
  profileImageUrl: string | null;
}) {
  const router = useRouter();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isInApp, setIsInApp] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line/i.test(ua)) {
      setIsInApp(true);
    } else if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      setIsIos(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (isInApp) {
      const url = window.location.href;
      if (/Android/i.test(navigator.userAgent)) {
        window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
      } else {
        window.open(url, "_blank");
      }
      return;
    }
    if (isIos) {
      setShowIosGuide(true);
      return;
    }
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem("pwa-installed", "true");
    }
    setInstallPrompt(null);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="grid gap-5 stagger-children">
      {/* 프로필 영역 (읽기 전용 — 사진 변경은 설정에서) */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-2 ring-border">
              {profileImageUrl ? (
                <Image src={profileImageUrl} alt={userName} width={56} height={56} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-black text-muted-foreground">{userName.charAt(0) || "?"}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-foreground truncate">{userName}</h2>
              <p className="text-sm text-muted-foreground truncate">
                {teamName}
                {teamRole && ` · ${roleLabels[teamRole] ?? teamRole}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메뉴 */}
      <div className="grid gap-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="transition-colors hover:bg-secondary/50">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-secondary ${item.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {/* 홈 화면에 추가 */}
        <button onClick={handleInstall}>
          <Card className="transition-colors hover:bg-secondary/50 border-primary/20">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {isInApp ? <ExternalLink className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">
                  {isInApp ? "브라우저에서 열기" : "홈 화면에 추가"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isInApp ? "외부 브라우저에서 열면 앱 설치가 가능해요" : "앱처럼 바로 접속하고 푸시 알림도 받을 수 있어요"}
                </p>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* 하단 영역: 로그아웃 + 개인정보처리방침/이용약관 */}
      <div className="space-y-4 pt-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive h-12"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut className="h-5 w-5" />
          {loggingOut ? "로그아웃 중..." : "로그아웃"}
        </Button>

        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/60">
          <a href="/privacy" className="hover:text-muted-foreground transition-colors">개인정보처리방침</a>
          <span>·</span>
          <a href="/terms" className="hover:text-muted-foreground transition-colors">이용약관</a>
        </div>
      </div>

      {/* iOS 설치 가이드 모달 */}
      {showIosGuide && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowIosGuide(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold">홈 화면에 추가하기</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                <p className="text-sm text-muted-foreground">Safari 하단 메뉴바에서 <span className="font-semibold text-foreground">공유 아이콘 ⬆︎</span> (네모에서 화살표 나온 모양)을 탭하세요</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                <p className="text-sm text-muted-foreground">메뉴에서 <span className="font-semibold text-foreground">&quot;홈 화면에 추가&quot;</span>를 선택하세요</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
                <p className="text-sm text-muted-foreground">우측 상단의 <span className="font-semibold text-foreground">&quot;추가&quot;</span>를 탭하세요</p>
              </div>
            </div>
            <button
              onClick={() => setShowIosGuide(false)}
              className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
