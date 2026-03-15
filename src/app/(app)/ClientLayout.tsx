"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SidebarNav from "@/components/SidebarNav";
import { ViewAsRoleProvider, useViewAsRole } from "@/lib/ViewAsRoleContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Check, Copy, Link2, Menu } from "lucide-react";
import type { Session, Role } from "@/lib/types";

type ClientLayoutProps = {
  session: Session;
  children: React.ReactNode;
};

export default function ClientLayout({ session, children }: ClientLayoutProps) {
  const canSwitchRole = session.user.name === "김선휘";

  return (
    <ViewAsRoleProvider isPresident={canSwitchRole}>
      <ClientLayoutInner session={session}>{children}</ClientLayoutInner>
    </ViewAsRoleProvider>
  );
}

function ClientLayoutInner({ session, children }: ClientLayoutProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { viewAsRole, setViewAsRole } = useViewAsRole();
  const canSwitchRole = session.user.name === "김선휘";
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navItems = useMemo(
    () => [
      { href: "/dashboard", label: "홈", detail: "대시보드" },
      { href: "/dues", label: "회비 관리", detail: "수납/지출" },
      { href: "/matches", label: "경기 관리", detail: "일정/투표" },
      { href: "/records", label: "내 기록", detail: "통계/랭킹" },
      { href: "/members", label: "회원 관리", detail: "멤버/권한" },
      { href: "/rules", label: "회칙", detail: "규정/공지" },
      { href: "/settings", label: "설정", detail: "개인/팀" },
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
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">PitchMaster</p>
        <h1 className="font-heading text-xl font-bold uppercase">{session.user.teamName}</h1>
        <p className="text-xs text-muted-foreground">
          {viewAsRole ? (
            <span className="text-amber-400">{roleLabel} 시점 체험 중</span>
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
                className="rounded-lg px-2 py-1 text-[11px]"
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
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">초대 코드</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-[0.2em] text-amber-300">{session.user.inviteCode}</p>
          <p className="mt-2 text-xs text-muted-foreground">멤버에게 공유해 팀에 초대하세요.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full gap-2 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            onClick={() => {
              const inviteUrl = `${window.location.origin}/onboarding?code=${session.user.inviteCode}`;
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
      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/board">게시판</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/notifications">알림</Link>
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[260px_1fr]">
        {/* Mobile Header */}
        <div className="lg:hidden">
          <Card className="backdrop-blur-sm bg-card/95">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">PitchMaster</p>
                <p className="text-lg font-bold">{session.user.teamName}</p>
              </div>
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] overflow-y-auto">
                  <SheetTitle className="sr-only">메뉴</SheetTitle>
                  <SheetDescription className="sr-only">네비게이션 메뉴</SheetDescription>
                  <div className="mt-6">{sidebarContent}</div>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden self-start lg:block animate-fade-in">
          <Card className="sticky top-4 p-5 shadow-lg shadow-black/20">
            {sidebarContent}
          </Card>
        </aside>

        {/* Main Content */}
        <div className="min-w-0 space-y-4">
          <Card className="hidden lg:block">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sky-400">팀 운영 현황</p>
                <h2 className="font-heading text-xl font-bold uppercase">오늘의 팀 운영 현황</h2>
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
          <div className="animate-fade-in-up">{children}</div>
        </div>
      </div>
    </div>
  );
}
