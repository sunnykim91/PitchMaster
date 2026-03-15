"use server";

import { redirect } from "next/navigation";
import { auth, updateSession, isSupabaseConfigured } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PreferredPosition, PreferredFoot } from "@/lib/types";

export async function completeOnboarding(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const name = String(formData.get("name") || "").trim();
  const birthDate = String(formData.get("birthDate") || "");
  const phone = String(formData.get("phone") || "").trim();
  const preferredFoot = String(formData.get("preferredFoot") || "RIGHT") as PreferredFoot;
  const preferredPositions = formData.getAll("preferredPositions").map((value) => String(value)) as PreferredPosition[];

  // Save to Supabase if configured
  if (isSupabaseConfigured() && !session.user.isDemo) {
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
  }

  await updateSession({
    name,
    birthDate,
    phone,
    preferredFoot,
    preferredPositions,
    isProfileComplete: true,
  });

  redirect("/team");
}
