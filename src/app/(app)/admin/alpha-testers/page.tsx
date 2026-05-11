import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AlphaTestersClient from "./AlphaTestersClient";

export const metadata: Metadata = {
  title: "알파 테스터 관리 — PitchMaster",
  description: "Play Store 알파 테스터 등록·14일 출석 추적",
};

export default async function AlphaTestersAdminPage() {
  const session = await auth();
  if (!session || session.user.name !== "김선휘") redirect("/dashboard");
  return <AlphaTestersClient />;
}
