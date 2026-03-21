"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SidebarNav from "@/components/SidebarNav";
import { ViewAsRoleProvider, useViewAsRole } from "@/lib/ViewAsRoleContext";
import { ToastProvider } from "@/lib/ToastContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Check, Copy, Link2, Menu, ChevronDown, Plus, Home, Calendar, Trophy, Wallet, MessageSquare, Bell, Users, BookOpen, Settings, MoreHorizontal } from "lucide-react";
import type { Session, Role } from "@/lib/types";
import { isStaffOrAbove } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type ClientLayoutProps = {
  session: Session;
  children: React.ReactNode;
};

export default function ClientLayout({ session, children }: ClientLayoutProps) {
  const canSwitchRole = session.user.name === "김선휘";

  return (
    <ViewAsRoleProvider isPresident={canSwitchRole}>
      <ToastProvider>
        <ClientLayoutInner session={session}>{children}</ClientLayoutInner>
      </ToastProvider>
    </ViewAsRoleProvider>
  );
}

type TeamInfo = {
  id: string;
  name: string;
  inviteCode: string;
  sportType: string;
  role: Role;
  isCurrent: boolean;
};

function ClientLayoutInner({ session, children }: ClientLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { viewAsRole, setViewAsRole } = useViewAsRole();
  const canSwitchRole = session.user.name === "김선휘";
  const [copied, setCopied] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [sheetClosing, setSheetClosing] = useState(false);

  function closeSheet() {
    setSheetClosing(true);
    setTimeout(() => {
      setMoreSheetOpen(false);
      setSheetClosing(false);
    }, 200);
  }

  // 팀 스위처
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [teamMenuOpen, setTeamMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/teams/my-teams");
      const data = await res.json();
      if (data.teams) setTeams(data.teams);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  async function handleSwitchTeam(teamId: string) {
    if (switching) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/teams/my-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (res.ok) {
        setTeamMenuOpen(false);
        router.refresh();
        window.location.href = "/dashboard";
      }
    } finally {
      setSwitching(false);
    }
  }

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!teamMenuOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setTeamMenuOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-team-menu]")) setTeamMenuOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClickOutside, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [teamMenuOpen]);

  const navItems = useMemo(
    () => [
      { href: "/dashboard", label: "홈", detail: "대시보드", icon: Home },
      { href: "/matches", label: "경기 일정", detail: "일정/투표", icon: Calendar },
      { href: "/records", label: "내 기록", detail: "통계/랭킹", icon: Trophy },
      { href: "/dues", label: "회비 관리", detail: "거래 내역/납부", icon: Wallet },
      { href: "/members", label: "회원 관리", detail: "멤버/권한", icon: Users },
      { href: "/board", label: "게시판", detail: "공지/자유", icon: MessageSquare },
      { href: "/notifications", label: "알림", detail: "알림 센터", icon: Bell },
      { href: "/rules", label: "회칙", detail: "팀 규정", icon: BookOpen },
      { href: "/settings", label: "설정", detail: "개인/팀", icon: Settings },
    ],
    []
  );

  const displayRole = viewAsRole ?? session.user.teamRole;
  const roleLabel =
    displayRole === "PRESIDENT"
      ? "회장"
      : displayRole === "STAFF"
      ? "운영진"
      : "평회원";

  const sidebarContent = (
    <>
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">PitchMaster</p>
        <div className="relative" data-team-menu>
          <button
            type="button"
            className="flex items-center gap-1 font-heading text-xl font-bold uppercase hover:text-primary transition-colors"
            onClick={() => setTeamMenuOpen(!teamMenuOpen)}
            aria-expanded={teamMenuOpen}
            aria-haspopup="listbox"
          >
            {session.user.teamName}
            {(() => {
              const current = teams.find((t) => t.isCurrent);
              const st = current?.sportType ?? "SOCCER";
              return (
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${st === "FUTSAL" ? "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]" : "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"}`}>
                  {st === "FUTSAL" ? "풋살" : "축구"}
                </span>
              );
            })()}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          {teamMenuOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border bg-popover p-1 shadow-lg" role="listbox" aria-label="팀 선택">
              {teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={t.isCurrent || switching}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent disabled:opacity-50 transition-colors"
                  onClick={() => handleSwitchTeam(t.id)}
                >
                  <span className={t.isCurrent ? "font-bold text-primary" : ""}>{t.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.role === "PRESIDENT" ? "회장" : t.role === "STAFF" ? "운영진" : "평회원"}
                  </span>
                </button>
              ))}
              <Separator className="my-1" />
              <Link
                href="/team"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                onClick={() => setTeamMenuOpen(false)}
              >
                <Plus className="h-3.5 w-3.5" />
                새 팀 추가
              </Link>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {viewAsRole ? (
            <span className="text-[hsl(var(--warning))]">{roleLabel} 시점 체험 중</span>
          ) : (
            <>{roleLabel}</>
          )}
          {" · "}{session.user.name}
        </p>
      </div>
      {canSwitchRole && (
        <div className="mt-2 flex gap-1">
          {(["PRESIDENT", "STAFF", "MEMBER"] as Role[]).map((role) => {
            const label = role === "PRESIDENT" ? "회장" : role === "STAFF" ? "운영진" : "평회원";
            const isActive = viewAsRole ? viewAsRole === role : role === "PRESIDENT";
            return (
              <Button
                key={role}
                type="button"
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="rounded-lg px-2 py-1 text-xs"
                onClick={() => setViewAsRole(role === "PRESIDENT" ? null : role)}
              >
                {label}
              </Button>
            );
          })}
        </div>
      )}
      <Separator className="my-4" />
      <SidebarNav items={navItems} />
      <Separator className="my-4" />
      <Card className="border-[hsl(var(--accent))]/20 bg-[hsl(var(--accent))]/5">
        <CardContent className="p-4">
          <p className="type-overline text-[hsl(var(--accent))]">초대 코드</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-[0.2em] text-[hsl(var(--accent))]">{session.user.inviteCode}</p>
          <p className="mt-2 text-xs text-muted-foreground">멤버에게 공유해 팀에 초대하세요.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full gap-2 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            onClick={() => {
              const inviteUrl = `${window.location.origin}/team?code=${session.user.inviteCode}`;
              navigator.clipboard.writeText(inviteUrl).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
            {copied ? "복사됨!" : "초대 링크 복사"}
          </Button>
        </CardContent>
      </Card>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-1" asChild>
          <Link href="/team"><Plus className="h-3.5 w-3.5" />새 팀</Link>
        </Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground/50">
        v{process.env.NEXT_PUBLIC_COMMIT_HASH}
      </p>
    </>
  );

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="mx-auto grid max-w-7xl gap-4 px-3 sm:px-4 py-4 lg:grid-cols-[260px_1fr]">
        {/* Mobile Header */}
        <header className="lg:hidden">
          <Card className="backdrop-blur-sm bg-card/95">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">PitchMaster</p>
                <p className="text-lg font-bold flex items-center gap-1">
                  {session.user.teamName}
                  {(() => {
                    const current = teams.find((t) => t.isCurrent);
                    const st = current?.sportType ?? "SOCCER";
                    return (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${st === "FUTSAL" ? "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]" : "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"}`}>
                        {st === "FUTSAL" ? "풋살" : "축구"}
                      </span>
                    );
                  })()}
                  {teams.length > 1 && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {teams.length}팀
                    </Badge>
                  )}
                </p>
              </div>
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="메뉴 열기">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] overflow-y-auto">
                  <SheetTitle className="text-sm font-bold text-foreground">메뉴</SheetTitle>
                  <SheetDescription className="sr-only">네비게이션 메뉴</SheetDescription>
                  <div className="mt-6">{sidebarContent}</div>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>
        </header>

        {/* Desktop Sidebar */}
        <aside className="hidden self-start lg:block animate-fade-in">
          <Card className="sticky top-4 p-5 shadow-lg shadow-foreground/10 sidebar-atmosphere">
            {sidebarContent}
          </Card>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 space-y-4 pb-16 lg:pb-0">
          {isStaffOrAbove(displayRole) && (
            <Card className="hidden lg:block">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <h2 className="font-heading text-lg sm:text-xl font-bold uppercase">빠른 작업</h2>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" asChild>
                    <Link href="/matches">경기 일정 등록</Link>
                  </Button>
                  <Button variant="success" size="sm" asChild>
                    <Link href="/dues">회비 기록 입력</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="animate-fade-in-up">{children}</div>

          {/* Footer */}
          <footer className="mt-12 border-t border-border/20 pb-6 pt-4 text-center">
            <div className="flex justify-center gap-3 text-xs text-muted-foreground/50">
              <Link href="/privacy" className="transition hover:text-foreground">개인정보처리방침</Link>
              <span>·</span>
              <Link href="/terms" className="transition hover:text-foreground">이용약관</Link>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/85 backdrop-blur-xl backdrop-saturate-150 lg:hidden">
        <div className="flex items-center justify-around">
          {[
            { href: "/dashboard", label: "홈", icon: Home },
            { href: "/matches", label: "일정", icon: Calendar },
            { href: "/records", label: "기록", icon: Trophy },
            { href: "/dues", label: "회비", icon: Wallet },
          ].map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 px-3 py-2 text-xs active:scale-95 transition-all",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute -top-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary" />
                )}
                <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                {tab.label}
              </Link>
            );
          })}
          {(() => {
            const isMoreActive = ["/members", "/board", "/notifications", "/rules", "/settings"].some((p) => pathname === p || pathname.startsWith(p + "/"));
            return (
              <button
                onClick={() => setMoreSheetOpen(true)}
                className={cn(
                  "relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 px-3 py-2 text-xs active:scale-95 transition-all",
                  isMoreActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isMoreActive && (
                  <span className="absolute -top-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary" />
                )}
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-xs">더보기</span>
              </button>
            );
          })()}
        </div>
      </nav>

      {/* More Bottom Sheet */}
      {moreSheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={closeSheet}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 rounded-t-2xl bg-card p-4 pb-8 shadow-2xl",
              sheetClosing ? "animate-sheet-slide-down" : "animate-slide-up"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
            <nav className="grid gap-1">
              {[
                { href: "/members", icon: Users, label: "회원관리" },
                { href: "/board", icon: MessageSquare, label: "게시판" },
                { href: "/notifications", icon: Bell, label: "알림" },
                { href: "/rules", icon: BookOpen, label: "회칙" },
                { href: "/settings", icon: Settings, label: "설정" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSheet}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
