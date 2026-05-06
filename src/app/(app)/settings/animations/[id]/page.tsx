import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { isStaffOrAbove } from "@/lib/permissions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import AnimationEditorClient from "./AnimationEditorClient";
import type { TeamTacticalAnimation } from "@/lib/formationMotions/dbTypes";

export const metadata: Metadata = {
  title: "전술 애니메이션 편집 — PitchMaster",
};

type Props = { params: Promise<{ id: string }> };

export default async function AnimationEditorPage({ params }: Props) {
  const session = await auth();
  if (!session) return null;
  if (!isStaffOrAbove(session.user.teamRole)) return notFound();
  // 베타 — FCMZ 팀만 진입
  if (session.user.teamName !== "FCMZ") return notFound();

  const { id } = await params;
  const sb = getSupabaseAdmin();
  if (!sb) return notFound();

  const { data } = await sb
    .from("team_tactical_animations")
    .select("id, team_id, formation_id, name, description, animation_data, is_default, created_by, created_at, updated_at")
    .eq("id", id)
    .eq("team_id", session.user.teamId ?? "")
    .maybeSingle();

  if (!data) return notFound();

  return <AnimationEditorClient initial={data as TeamTacticalAnimation} />;
}
