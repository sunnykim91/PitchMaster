import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: "관리자 대시보드 — PitchMaster",
  description: "PitchMaster 전체 서비스 현황을 한눈에 확인합니다.",
};

export default async function AdminPage() {
  const session = await auth();
  if (!session || !isPlatformAdmin(session.user.id)) redirect("/dashboard");
  return <AdminClient />;
}
