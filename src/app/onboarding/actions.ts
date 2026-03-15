"use server";

import { redirect } from "next/navigation";
import { auth, updateSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PreferredPosition, PreferredFoot } from "@/lib/types";

const VALID_POSITIONS: PreferredPosition[] = ["GK", "CB", "LB", "RB", "CDM", "CAM", "LW", "RW", "ST"];
const VALID_FEET: PreferredFoot[] = ["RIGHT", "LEFT", "BOTH"];

export async function completeOnboarding(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const name = String(formData.get("name") || "").trim();
  const birthDate = String(formData.get("birthDate") || "");
  const phone = String(formData.get("phone") || "").replace(/\D/g, "");
  const preferredFoot = String(formData.get("preferredFoot") || "RIGHT") as PreferredFoot;
  const preferredPositions = formData.getAll("preferredPositions")
    .map((value) => String(value))
    .filter((v) => VALID_POSITIONS.includes(v as PreferredPosition)) as PreferredPosition[];

  // 서버 밸리데이션
  const errors: string[] = [];
  if (!name || name.length < 1) errors.push("이름을 입력해주세요");
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) errors.push("생년월일을 선택해주세요");
  if (!phone || phone.length < 10 || phone.length > 11) errors.push("올바른 전화번호를 입력해주세요");
  if (!VALID_FEET.includes(preferredFoot)) errors.push("주발을 선택해주세요");
  if (preferredPositions.length === 0) errors.push("선호 포지션을 최소 1개 선택해주세요");

  if (errors.length > 0) {
    const inviteCode = String(formData.get("inviteCode") || "").trim();
    const params = new URLSearchParams({ error: errors[0] });
    if (inviteCode) params.set("code", inviteCode);
    redirect(`/onboarding?${params.toString()}`);
  }

  const db = getSupabaseAdmin();
  if (db) {
    await db
      .from("users")
      .update({
        name,
        birth_date: birthDate || null,
        phone: phone || null,
        preferred_foot: preferredFoot,
        preferred_positions: preferredPositions,
        is_profile_complete: true,
      })
      .eq("id", session.user.id);
  }

  await updateSession({
    name,
    birthDate,
    phone,
    preferredFoot,
    preferredPositions,
    isProfileComplete: true,
  });

  const inviteCode = String(formData.get("inviteCode") || "").trim();
  redirect(inviteCode ? `/team?code=${encodeURIComponent(inviteCode)}` : "/team");
}
