import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import AdminNoticeClient, { type GlobalNoticeRow } from "./AdminNoticeClient";

export const metadata: Metadata = {
  title: "운영공지 작성 — PitchMaster 운영",
  description: "PitchMaster 운영자 전용 — 모든 팀에 노출되는 운영공지를 작성·관리합니다.",
};

/**
 * 운영공지 admin — PitchMaster 운영자(김선휘)만 접근.
 * 게시판 작성 폼과 분리해 운영 작업 컨텍스트를 명확히 분리.
 */
export default async function AdminNoticePage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.name !== "김선휘") redirect("/dashboard");

  const db = getSupabaseAdmin();
  const recent: GlobalNoticeRow[] = [];
  if (db) {
    const { data } = await db
      .from("posts")
      .select("id, title, content, created_at, team_id")
      .eq("is_global", true)
      .order("created_at", { ascending: false })
      .limit(20);
    if (Array.isArray(data)) {
      for (const r of data as Array<{ id: string; title: string; content: string; created_at: string; team_id: string }>) {
        recent.push({
          id: r.id,
          title: r.title,
          content: r.content,
          createdAt: r.created_at,
          teamId: r.team_id,
        });
      }
    }
  }

  return <AdminNoticeClient recent={recent} />;
}
