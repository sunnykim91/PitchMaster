import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isStaffOrAbove } from "@/lib/permissions";
import EvaluationHistoryView from "@/components/pitchAttributes/EvaluationHistoryView";
import BackButton from "@/components/BackButton";
import type { SportType } from "@/lib/playerAttributes/types";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ sport?: string }>;
};

export const metadata: Metadata = {
  title: "평가 이력 — PitchMaster",
};

const VALID_SPORTS: SportType[] = ["SOCCER", "FUTSAL"];

export default async function EvaluationHistoryPage({ params, searchParams }: Props) {
  const session = await auth().catch(() => null);
  if (!session) return notFound();

  const { memberId } = await params;
  const { sport } = await searchParams;

  const isSelf = session.user.id === memberId;
  const isStaff = isStaffOrAbove(session.user.teamRole);
  if (!isSelf && !isStaff) return notFound();

  const sb = getSupabaseAdmin();
  if (!sb) return notFound();

  // teams + users + team_members 병렬 lookup (SSR 직렬 await 단축)
  const teamId = session.user.teamId;
  const [teamRes, userRes, memberRes] = await Promise.all([
    sport || !teamId
      ? Promise.resolve({ data: null })
      : sb.from("teams").select("sport_type").eq("id", teamId).maybeSingle(),
    sb.from("users").select("name, deleted_at, is_banned").eq("id", memberId).maybeSingle(),
    isSelf || !teamId
      ? Promise.resolve({ data: { id: "self" } })
      : sb
          .from("team_members")
          .select("id")
          .eq("team_id", teamId)
          .eq("user_id", memberId)
          .in("status", ["ACTIVE", "DORMANT"])
          .maybeSingle(),
  ]);

  // 자기팀 멤버 한정 — 다른 팀 STAFF 가 임의 user_id 조회 차단
  if (!memberRes.data) return notFound();

  // 차단/삭제된 사용자 이력 차단
  const targetUser = userRes.data as { name: string | null; deleted_at: string | null; is_banned: boolean | null } | null;
  if (!targetUser) return notFound();
  if (targetUser.deleted_at || targetUser.is_banned) return notFound();
  const targetName = targetUser.name ?? "선수";

  // sport_type 결정 — query param 우선, 없으면 viewer 활성팀 기준
  let sportType: SportType;
  if (sport && VALID_SPORTS.includes(sport as SportType)) {
    sportType = sport as SportType;
  } else {
    const t = (teamRes.data as { sport_type?: string } | null)?.sport_type;
    sportType = t === "FUTSAL" ? "FUTSAL" : "SOCCER";
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <div className="mb-4">
        <BackButton label="뒤로" fallbackHref={isSelf ? "/records?tab=my" : "/members"} />
      </div>

      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">
          PitchScore™ 평가 이력
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          {isSelf ? "내 평가 이력" : `${targetName}님 평가 이력`}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {sportType === "FUTSAL" ? "풋살" : "축구"} 종목 · 평가자별 누적 세션
        </p>
      </header>

      <EvaluationHistoryView targetUserId={memberId} sportType={sportType} />
    </div>
  );
}
