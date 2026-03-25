import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: "관리자 대시보드 — PitchMaster",
  description: "PitchMaster 전체 서비스 현황을 한눈에 확인합니다.",
};

export default async function AdminPage() {
  const session = await auth();
  if (!session || session.user.name !== "김선휘") redirect("/dashboard");
  return <AdminClient />;
}
