"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/lib/ToastContext";
import { Check, X, Coffee, Trash2, RefreshCw, ChevronLeft, Clock, Mail } from "lucide-react";

const ALPHA_OPT_IN_URL = "https://play.google.com/apps/testing/app.pitchmaster";
const ALPHA_DOWNLOAD_URL = "https://play.google.com/store/apps/details?id=app.pitchmaster";
const OPEN_CHAT_URL = "https://open.kakao.com/o/gSoLopui";

function buildInviteMailto(email: string, name: string): string {
  const subject = `[PitchMaster] 알파 테스터 등록 완료 — Play Store에서 받아주세요!`;
  const body = `${name}님 안녕하세요, PitchMaster 운영자 김선휘입니다 :)

알파 테스터 등록해주셔서 정말 감사합니다.
운영자 측에서 Play Console 등록 완료해드렸습니다!

이제 아래 2단계만 진행해주시면 돼요.

────────────────────
[1단계] 알파 테스터 옵트인
${ALPHA_OPT_IN_URL}
→ 위 링크 접속 → "테스터 되기(Become a tester)" 버튼 클릭

[2단계] Play Store에서 앱 설치
${ALPHA_DOWNLOAD_URL}
→ Play Store에서 PitchMaster 알파 빌드 설치
   (옵트인 직후엔 몇 분 ~ 최대 1시간 정도 반영 시간이 걸릴 수 있어요)
────────────────────

[중요] 14일 동안 매일 한 번씩, 30초만이라도 앱을 켜주세요!
평소 쓰시던 웹/PWA 말고 꼭 Play Store에서 받은 알파 앱을 사용해주셔야 출석 카운트가 됩니다.

[보상] 14일 출석 완료하시면 커피 쿠폰 보내드립니다 ☕

[질문·진행상황 안내] 아래 카카오톡 오픈채팅방에 들어와주세요.
${OPEN_CHAT_URL}
(커피 쿠폰 수령도 오픈채팅방에서 진행됩니다)

진행하시다 막히는 부분 있으면 언제든 답장 주세요.
정말 감사합니다 🙏

— PitchMaster 김선휘`;

  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
import Link from "next/link";

type Tester = {
  id: string;
  userId: string;
  name: string;
  kakaoId: string | null;
  googleEmail: string;
  registeredAt: string;
  approvedAt: string | null;
  rewardedAt: string | null;
  notes: string | null;
  anchorDate: string | null; // 승인일 KST = D1
  dayDates: string[]; // 14개 (anchor ~ anchor+13). 미승인이면 빈 배열
  attendance: boolean[]; // 14개 — 미래 날짜는 false
  totalDays: number;
  streak: number;
};

type AlphaTestersResponse = {
  today: string;
  windowDays: number;
  testers: Tester[];
  summary: {
    total: number;
    approved: number;
    continuous14Count: number;
    eligibleForProduction: boolean;
  };
};

const empty: AlphaTestersResponse = {
  today: "",
  windowDays: 14,
  testers: [],
  summary: { total: 0, approved: 0, continuous14Count: 0, eligibleForProduction: false },
};

function formatRegistered(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

export default function AlphaTestersClient() {
  const { data, loading, error, refetch } = useApi<AlphaTestersResponse>(
    "/api/admin/alpha-testers",
    empty
  );
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => refetch(), 30000);
    return () => clearInterval(t);
  }, [refetch]);

  async function patchTester(
    id: string,
    patch: { approved?: boolean; rewarded?: boolean; notes?: string }
  ) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/alpha-testers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        showToast("갱신에 실패했습니다.", "error");
      } else {
        await refetch();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTester(id: string, name: string) {
    if (!confirm(`${name} 님을 알파 테스터에서 삭제하시겠어요? 출석 로그도 함께 삭제됩니다.`)) {
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/alpha-testers?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        showToast("삭제에 실패했습니다.", "error");
      } else {
        showToast("삭제되었습니다.");
        await refetch();
      }
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-destructive">오류: {error}</span>
          <Button variant="outline" size="sm" onClick={refetch}>
            다시 시도
          </Button>
        </div>
      </Card>
    );
  }

  const { today, windowDays, testers, summary } = data;
  const dayHeaders = Array.from({ length: windowDays }, (_, i) => `D${i + 1}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          관리자 대시보드
        </Link>
        <Button variant="ghost" size="sm" onClick={refetch}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          새로고침
        </Button>
      </div>

      <div>
        <h1 className="text-xl font-bold text-foreground">알파 테스터 관리</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          승인일(D1)부터 14일간 매일 출석. 12명이 14일 연속 도달하면 프로덕션 신청 가능
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">등록 인원</p>
            <p className="mt-1 text-lg font-bold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">승인 완료</p>
            <p className="mt-1 text-lg font-bold">{summary.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">14일 연속</p>
            <p
              className={`mt-1 text-lg font-bold ${
                summary.continuous14Count >= 12
                  ? "text-[hsl(var(--success))]"
                  : "text-foreground"
              }`}
            >
              {summary.continuous14Count} / 12
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">프로덕션 신청</p>
            <p
              className={`mt-1 text-sm font-bold ${
                summary.eligibleForProduction
                  ? "text-[hsl(var(--success))]"
                  : "text-muted-foreground"
              }`}
            >
              {summary.eligibleForProduction ? "✅ 가능" : "❌ 불가"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">출석 그리드 (D1 = 승인일)</CardTitle>
          <p className="text-[11px] text-muted-foreground mt-1">
            오늘 (KST): <span className="font-mono font-semibold text-foreground">{today}</span>
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {testers.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              아직 등록된 알파 테스터가 없습니다.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card border-b">
                <tr>
                  <th className="sticky left-0 bg-card px-2 py-2 text-left font-semibold whitespace-nowrap">
                    이름
                  </th>
                  {dayHeaders.map((label) => (
                    <th
                      key={label}
                      className="px-1 py-2 text-center font-medium whitespace-nowrap text-muted-foreground"
                    >
                      {label}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">누적</th>
                  <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">연속</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {testers.map((t) => {
                  const noAnchor = !t.anchorDate;
                  return (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-secondary/20">
                      <td className="sticky left-0 bg-card px-2 py-2">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">{t.name}</span>
                            {t.approvedAt ? (
                              <Badge variant="default" className="h-4 text-[10px] px-1.5">
                                승인
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="h-4 text-[10px] px-1.5">
                                대기
                              </Badge>
                            )}
                            {t.rewardedAt && (
                              <Coffee className="h-3 w-3 text-[hsl(var(--warning))]" />
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                            {t.googleEmail}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            등록 {formatRegistered(t.registeredAt)}
                            {t.anchorDate && (
                              <>
                                {" · "}D1 {formatDateShort(t.anchorDate)}
                              </>
                            )}
                          </span>
                        </div>
                      </td>
                      {Array.from({ length: windowDays }).map((_, i) => {
                        if (noAnchor) {
                          return (
                            <td key={i} className="px-1 py-2 text-center">
                              <span className="inline-block h-5 w-5 rounded bg-secondary/40" />
                            </td>
                          );
                        }
                        const dayDate = t.dayDates[i];
                        const isFuture = dayDate > today;
                        const present = t.attendance[i];
                        return (
                          <td key={i} className="px-1 py-2 text-center">
                            {isFuture ? (
                              <span
                                className="inline-flex h-5 w-5 items-center justify-center rounded bg-secondary/40 text-muted-foreground"
                                title={`${dayDate} (예정)`}
                              >
                                <Clock className="h-3 w-3" />
                              </span>
                            ) : present ? (
                              <span
                                className="inline-flex h-5 w-5 items-center justify-center rounded bg-[hsl(var(--success))]/15"
                                title={dayDate}
                              >
                                <Check className="h-3 w-3 text-[hsl(var(--success))]" />
                              </span>
                            ) : (
                              <span
                                className="inline-flex h-5 w-5 items-center justify-center rounded bg-destructive/10"
                                title={dayDate}
                              >
                                <X className="h-3 w-3 text-destructive" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-semibold">
                        {noAnchor ? "—" : `${t.totalDays}/14`}
                      </td>
                      <td
                        className={`px-2 py-2 text-center font-bold ${
                          t.streak >= 14
                            ? "text-[hsl(var(--success))]"
                            : t.streak >= 7
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {noAnchor ? "—" : t.streak}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant={t.approvedAt ? "default" : "outline"}
                            className="h-6 px-2 text-[10px]"
                            disabled={busyId === t.id}
                            onClick={() => patchTester(t.id, { approved: !t.approvedAt })}
                          >
                            {t.approvedAt ? "승인 취소" : "승인"}
                          </Button>
                          <a
                            href={buildInviteMailto(t.googleEmail, t.name)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md border bg-background hover:bg-secondary"
                            title="안내 메일 보내기"
                          >
                            <Mail className="h-3 w-3 text-primary" />
                          </a>
                          <Button
                            size="sm"
                            variant={t.rewardedAt ? "default" : "outline"}
                            className="h-6 px-2 text-[10px]"
                            disabled={busyId === t.id}
                            onClick={() => patchTester(t.id, { rewarded: !t.rewardedAt })}
                          >
                            {t.rewardedAt ? "쿠폰 취소" : "쿠폰 지급"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            disabled={busyId === t.id}
                            onClick={() => deleteTester(t.id, t.name)}
                            title="삭제"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">D1 = 승인일.</span> 운영자가 Play
            Console에 등록한 뒤 "승인" 버튼을 누른 시점부터 14일 카운트가 시작됩니다. 그 전까지는
            그리드가 회색으로 표시되며 카운트되지 않습니다.
          </p>
          <p>
            <span className="font-semibold text-foreground">출석 기록:</span> 알파 테스터가
            PitchMaster 진입 시 자동 ping. KST 자정 기준 하루 1회 카운트 (✅ 출석 / ❌ 미출석 / ⏱
            예정)
          </p>
          <p>
            <span className="font-semibold text-foreground">연속 출석:</span> 오늘부터 거꾸로 끊김
            없이 출석한 일수. D1부터 빠짐없이 출석하면 D14 시점에 14가 됩니다. 12명이 14에 도달하면
            프로덕션 신청 가능
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
