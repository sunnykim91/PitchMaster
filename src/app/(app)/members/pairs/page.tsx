import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isStaffOrAbove } from "@/lib/permissions";
import { getPairSynergy } from "@/lib/server/getPairSynergy";
import MembersPairsClient from "./MembersPairsClient";

export const metadata: Metadata = {
  title: "페어 시너지 — PitchMaster",
  description: "같이 뛸 때 잘 풀리는 팀원 페어를 시즌 누적으로 확인하세요.",
};

export default async function MembersPairsPage() {
  const session = await auth();
  if (!session) return null;
  if (!isStaffOrAbove(session.user.teamRole)) {
    redirect("/members");
  }
  const data = await getPairSynergy(session.user.teamId!);
  return <MembersPairsClient initialData={data} />;
}
