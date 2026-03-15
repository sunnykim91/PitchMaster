"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createTeam, joinTeam } from "@/app/team/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TeamClient() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const pending = searchParams.get("pending");

  const [teamName, setTeamName] = useState("");
  const [nameStatus, setNameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = teamName.trim();
    if (!trimmed || trimmed.length < 2) {
      setNameStatus("idle");
      return;
    }

    setNameStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/teams/check-name?name=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setNameStatus(data.available ? "available" : "taken");
      } catch {
        setNameStatus("idle");
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [teamName]);

  const errorMessage =
    error === "duplicate_name"
      ? "이미 사용 중인 팀명입니다. 다른 이름을 입력해주세요."
      : error === "invalid_code"
        ? "유효하지 않은 초대 코드입니다."
        : error === "expired_code"
          ? "만료된 초대 코드입니다."
          : null;

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-5xl">
        {errorMessage && (
          <Card className="mb-6 border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-sm font-semibold text-destructive">
              {errorMessage}
            </CardContent>
          </Card>
        )}

        {pending && (
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 text-sm font-semibold text-amber-500">
              가입 신청이 완료되었습니다. 팀 관리자의 승인을 기다려주세요.
            </CardContent>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">Create</p>
              <CardTitle className="font-heading text-2xl font-bold uppercase">새 팀 만들기</CardTitle>
              <CardDescription>팀명을 입력하면 초대 코드가 생성됩니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createTeam} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName">팀명</Label>
                  <Input
                    id="teamName"
                    name="teamName"
                    required
                    placeholder="예: 한강 FC"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                  {nameStatus === "checking" && (
                    <p className="text-xs text-muted-foreground animate-pulse">중복 확인 중...</p>
                  )}
                  {nameStatus === "available" && (
                    <p className="text-xs text-green-500">사용 가능한 팀명입니다.</p>
                  )}
                  {nameStatus === "taken" && (
                    <p className="text-xs text-destructive">이미 사용 중인 팀명입니다.</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={nameStatus === "taken" || nameStatus === "checking"}
                >
                  팀 생성하기
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">Join</p>
              <CardTitle className="font-heading text-2xl font-bold uppercase">초대 코드로 가입</CardTitle>
              <CardDescription>팀에서 받은 초대 코드를 입력하면 즉시 가입됩니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={joinTeam} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">초대 코드</Label>
                  <Input id="inviteCode" name="inviteCode" required placeholder="예: PITCH42" />
                </div>
                <Button type="submit" variant="secondary" className="w-full">팀 가입하기</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
