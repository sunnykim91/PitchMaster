"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { createTeam, joinTeam } from "@/app/team/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GA } from "@/lib/analytics";

export default function TeamClient({ hasExistingTeam = false }: { hasExistingTeam?: boolean }) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const pending = searchParams.get("pending");
  const codeFromUrl = searchParams.get("code") ?? "";

  // 온보딩 완료 신호 — completeOnboarding 이 ?welcome=onboarded 로 redirect
  useEffect(() => {
    if (searchParams.get("welcome") === "onboarded") {
      GA.onboardingComplete();
      // URL 깨끗이 — code 파라미터는 유지
      const code = searchParams.get("code");
      const cleanUrl = code ? `/team?code=${encodeURIComponent(code)}` : "/team";
      window.history.replaceState(null, "", cleanUrl);
    }
  }, [searchParams]);

  const [teamName, setTeamName] = useState("");
  const [nameStatus, setNameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 팀 검색 상태
  type SearchResult = {
    id: string;
    name: string;
    sportType: string;
    memberCount: number;
    hasPendingRequest: boolean;
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [joiningTeamId, setJoiningTeamId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // 팀 검색 debounce
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/teams/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setSearchResults(data.teams ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // 가입 신청 핸들러
  async function handleJoinRequest(teamId: string) {
    setJoiningTeamId(teamId);
    setJoinError(null);
    try {
      const res = await fetch("/api/teams/join-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (res.ok) {
        // 검색 결과에서 해당 팀을 "신청 대기 중"으로 업데이트
        setSearchResults((prev) =>
          prev.map((t) => (t.id === teamId ? { ...t, hasPendingRequest: true } : t))
        );
      } else {
        const data = await res.json();
        const msg =
          data.error === "already_member"
            ? "이미 해당 팀에 소속되어 있습니다."
            : data.error === "already_requested" || res.status === 409
              ? "이미 가입 신청한 팀입니다."
              : data.error ?? "가입 신청에 실패했습니다.";
        setJoinError(msg);
      }
    } catch {
      setJoinError("네트워크 오류가 발생했습니다.");
    } finally {
      setJoiningTeamId(null);
    }
  }

  const errorMessage =
    error === "duplicate_name"
      ? "이미 사용 중인 팀명입니다. 다른 이름을 입력해주세요."
      : error === "invalid_code"
        ? "유효하지 않은 초대 코드입니다."
        : error === "expired_code"
          ? "만료된 초대 코드입니다."
          : error === "already_member"
            ? "이미 해당 팀에 소속되어 있습니다."
            : error === "already_requested"
              ? "이미 가입 신청한 팀입니다."
              : error === "demo_blocked"
                ? "데모 모드에서는 팀 생성/가입이 불가합니다. 카카오 로그인 후 이용해주세요."
                : null;

  const createTeamCard = (
    <Card>
      <CardHeader>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Create</p>
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
          <div className="space-y-2">
            <Label>스포츠 유형</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "SOCCER", label: "축구", desc: "11 vs 11" },
                { value: "FUTSAL", label: "풋살", desc: "3~8명" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-border bg-card px-4 py-3 text-center transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="radio"
                    name="sportType"
                    value={opt.value}
                    defaultChecked={opt.value === "SOCCER"}
                    className="sr-only"
                  />
                  <span className="text-sm font-bold">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </label>
              ))}
            </div>
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
  );

  const searchTeamCard = (
    <Card>
      <CardHeader>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Search</p>
        <CardTitle className="font-heading text-2xl font-bold uppercase">팀 검색해서 가입</CardTitle>
        <CardDescription>팀 이름을 검색하면 가입 신청할 수 있습니다. 운영진 승인 후 가입됩니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            placeholder="팀 이름 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searching && (
            <p className="text-sm text-muted-foreground animate-pulse text-center py-2">검색 중...</p>
          )}
          {joinError && (
            <p className="text-sm font-semibold text-destructive text-center py-2">{joinError}</p>
          )}
          {searchResults.map((team) => (
            <div
              key={team.id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-semibold">{team.name}</p>
                <p className="text-sm text-muted-foreground">
                  {team.sportType === "SOCCER" ? "축구" : "풋살"} · {team.memberCount}명
                </p>
              </div>
              {team.hasPendingRequest ? (
                <Badge variant="secondary">신청 대기 중</Badge>
              ) : (
                <Button
                  size="sm"
                  disabled={joiningTeamId === team.id}
                  onClick={() => handleJoinRequest(team.id)}
                >
                  {joiningTeamId === team.id ? "신청 중..." : "가입 신청"}
                </Button>
              )}
            </div>
          ))}
          {searchQuery.trim().length >= 2 && searchResults.length === 0 && !searching && (
            <p className="text-sm text-muted-foreground text-center py-4">
              검색 결과가 없습니다. 초대 코드로 가입하거나 새 팀을 만들어보세요.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-5xl">
        {hasExistingTeam && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="flex items-center justify-between p-4">
              <p className="text-sm text-muted-foreground">이미 소속된 팀이 있습니다. 추가로 팀을 만들거나 다른 팀에 가입할 수 있습니다.</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">대시보드로 돌아가기</Link>
              </Button>
            </CardContent>
          </Card>
        )}

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

        {/* ── 초대 코드로 가입 (code 있으면 메인, 없으면 2열 중 우측) ── */}
        {codeFromUrl ? (
          <>
            {/* 초대 코드가 있을 때: 가입 폼을 메인으로 */}
            <Card className="border-primary/20">
              <CardHeader className="text-center">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Join Team</p>
                <CardTitle className="font-heading text-2xl font-bold uppercase">팀에 가입하기</CardTitle>
                <CardDescription>초대 코드가 확인되었습니다. 아래 버튼을 눌러 가입하세요.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={joinTeam} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">초대 코드</Label>
                    <Input id="inviteCode" name="inviteCode" required placeholder="예: PITCH42" defaultValue={codeFromUrl} />
                  </div>
                  <Button type="submit" className="w-full">팀 가입하기</Button>
                </form>
              </CardContent>
            </Card>

            {/* 팀 생성/검색은 접힌 상태로 */}
            <details className="mt-6 group">
              <summary className="flex cursor-pointer items-center justify-center gap-1.5 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <span>새 팀을 만들거나 다른 팀을 검색하고 싶으신가요?</span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4 grid gap-8 lg:grid-cols-2">
                {createTeamCard}
                {searchTeamCard}
              </div>
            </details>
          </>
        ) : (
          <>
            {/* 초대 코드가 없을 때: 기존 2열 레이아웃 */}
            <div className="grid gap-8 lg:grid-cols-2">
              {createTeamCard}

              <Card>
                <CardHeader>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Join</p>
                  <CardTitle className="font-heading text-2xl font-bold uppercase">초대 코드로 가입</CardTitle>
                  <CardDescription>팀에서 받은 초대 코드를 입력하면 즉시 가입됩니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form action={joinTeam} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteCode">초대 코드</Label>
                      <Input id="inviteCode" name="inviteCode" required placeholder="예: PITCH42" defaultValue={codeFromUrl} />
                    </div>
                    <Button type="submit" variant="secondary" className="w-full">팀 가입하기</Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* 팀 검색 */}
            <div className="mt-8">
              {searchTeamCard}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
