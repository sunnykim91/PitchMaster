"use server";

import { redirect } from "next/navigation";
import { auth, updateSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { validateSafeName } from "@/lib/validators/safeText";
import type { PreferredPosition, PreferredFoot } from "@/lib/types";

const VALID_POSITIONS: PreferredPosition[] = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST", "FIXO", "ALA", "PIVO"];
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

  // 서버 밸리데이션 (이름 + 포지션만 필수, 나머지 선택)
  const errors: string[] = [];
  const nameCheck = validateSafeName(name, { maxLength: 20 });
  if (!nameCheck.ok) errors.push(nameCheck.reason);
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) errors.push("올바른 생년월일 형식이 아닙니다");
  if (phone && (phone.length < 10 || phone.length > 11)) errors.push("올바른 전화번호를 입력해주세요");
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
        name: nameCheck.ok ? nameCheck.value : name,
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
  // welcome=onboarded 신호로 TeamClient 가 GA.onboardingComplete() 발화
  const params = new URLSearchParams({ welcome: "onboarded" });
  if (inviteCode) params.set("code", inviteCode);
  redirect(`/team?${params.toString()}`);
}
