"use server";

import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { auth, updateSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function createTeam(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const teamName = String(formData.get("teamName") || "").trim() || "우리 팀";
  const sportType = String(formData.get("sportType") || "SOCCER");
  const inviteCode = nanoid(6).toUpperCase();

  const db = getSupabaseAdmin();
  if (!db) throw new Error("Database not configured");

  // 팀명 중복 체크
  const { data: existing } = await db
    .from("teams")
    .select("id")
    .eq("name", teamName)
    .single();

  if (existing) {
    redirect("/team?error=duplicate_name");
    return;
  }

  // Create team in DB
  const { data: team, error: teamError } = await db
    .from("teams")
    .insert({ name: teamName, invite_code: inviteCode, sport_type: sportType })
    .select()
    .single();

  if (teamError || !team) throw new Error("Failed to create team");

  // Add creator as PRESIDENT
  await db.from("team_members").insert({
    team_id: team.id,
    user_id: session.user.id,
    role: "PRESIDENT",
    status: "ACTIVE",
  });

  // Create default season (yearly)
  const year = new Date().getFullYear();
  await db.from("seasons").insert({
    team_id: team.id,
    name: `${year}`,
    start_date: `${year}-01-01`,
    end_date: `${year}-12-31`,
    is_active: true,
  });

  await updateSession({
    teamId: team.id,
    teamName: team.name,
    teamRole: "PRESIDENT",
    inviteCode: team.invite_code,
  });
  redirect("/dashboard");
}

export async function joinTeam(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const inviteCode = String(formData.get("inviteCode") || "").trim().toUpperCase();
  if (!inviteCode) redirect("/team");

  const db = getSupabaseAdmin();
  if (!db) throw new Error("Database not configured");

  // Find team by invite code
  const { data: team } = await db
    .from("teams")
    .select("*")
    .eq("invite_code", inviteCode)
    .single();

  if (!team) {
    redirect("/team?error=invalid_code");
    return;
  }

  // Check if invite has expired
  if (team.invite_expires_at && new Date(team.invite_expires_at) < new Date()) {
    redirect("/team?error=expired_code");
    return;
  }

  // Check if already a member (with user_id linked)
  const { data: existing } = await db
    .from("team_members")
    .select("id, role")
    .eq("team_id", team.id)
    .eq("user_id", session.user.id)
    .single();

  if (existing) {
    await updateSession({
      teamId: team.id,
      teamName: team.name,
      teamRole: existing.role ?? "MEMBER",
      inviteCode: team.invite_code,
    });
    redirect("/dashboard");
    return;
  }

  // 사전 등록 멤버 자동 연동: 전화번호 → 이름 순으로 매칭
  const userPhone = session.user.phone?.replace(/\D/g, "") ?? "";
  const userName = session.user.name ?? "";
  let linkedMemberId: string | null = null;
  let linkedRole: string = "MEMBER";

  if (userPhone) {
    const { data: phoneMatch } = await db
      .from("team_members")
      .select("id, role")
      .eq("team_id", team.id)
      .is("user_id", null)
      .eq("pre_phone", userPhone)
      .limit(1)
      .single();

    if (phoneMatch) {
      linkedMemberId = phoneMatch.id;
      linkedRole = phoneMatch.role;
    }
  }

  if (!linkedMemberId && userName) {
    const { data: nameMatches } = await db
      .from("team_members")
      .select("id, role")
      .eq("team_id", team.id)
      .is("user_id", null)
      .eq("pre_name", userName);

    if (nameMatches && nameMatches.length === 1) {
      linkedMemberId = nameMatches[0].id;
      linkedRole = nameMatches[0].role;
    }
    // 이름 중복(2명+)이면 자동 연동 안 함 → 회장이 수동 연동
  }

  if (linkedMemberId) {
    // 사전 등록 row에 user_id 연결
    await db
      .from("team_members")
      .update({ user_id: session.user.id, pre_name: null, pre_phone: null })
      .eq("id", linkedMemberId);

    await updateSession({
      teamId: team.id,
      teamName: team.name,
      teamRole: linkedRole as "PRESIDENT" | "STAFF" | "MEMBER",
      inviteCode: team.invite_code,
    });
    redirect("/dashboard");
    return;
  }

  // 매칭 없으면 새 row 생성
  const status = team.join_mode === "MANUAL" ? "PENDING" : "ACTIVE";

  await db.from("team_members").insert({
    team_id: team.id,
    user_id: session.user.id,
    role: "MEMBER",
    status,
  });

  if (status === "PENDING") {
    redirect("/team?pending=true");
    return;
  }

  await updateSession({
    teamId: team.id,
    teamName: team.name,
    teamRole: "MEMBER",
    inviteCode: team.invite_code,
  });
  redirect("/dashboard");
}
