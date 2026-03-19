"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MessageSquare, Bell, BookOpen, Settings } from "lucide-react";

const menuItems = [
  { href: "/members", label: "회원 관리", desc: "멤버 목록 · 역할 관리", icon: Users, color: "text-[hsl(var(--success))]" },
  { href: "/board", label: "게시판", desc: "공지 · 자유 게시판", icon: MessageSquare, color: "text-primary" },
  { href: "/notifications", label: "알림", desc: "알림 센터", icon: Bell, color: "text-[hsl(var(--warning))]" },
  { href: "/rules", label: "회칙", desc: "팀 규정 관리", icon: BookOpen, color: "text-[hsl(var(--accent))]" },
  { href: "/settings", label: "설정", desc: "프로필 · 팀 설정", icon: Settings, color: "text-muted-foreground" },
];

export default function MoreClient() {
  return (
    <div className="grid gap-5 stagger-children">
      <Card>
        <CardContent className="p-6">
          <h2 className="font-heading text-lg sm:text-2xl font-bold uppercase">더보기</h2>
        </CardContent>
      </Card>

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
      </div>
    </div>
  );
}
