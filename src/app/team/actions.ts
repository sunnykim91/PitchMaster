"use server";

import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { auth, updateSession, isSupabaseConfigured } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function createTeam(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const teamName = String(formData.get("teamName") || "").trim() || "우리 팀";
  const inviteCode = nanoid(6).toUpperCase();

  if (isSupabaseConfigured() && !session.user.isDemo) {
    const db = getSupabaseAdmin();
    if (db) {
      // Create team in DB
      const { data: team, error: teamError } = await db
        .from("teams")
        .insert({ name: teamName, invite_code: inviteCode })
        .select()
        .single();

      if (!teamError && team) {
        // Add creator as PRESIDENT
        await db.from("team_members").insert({
          team_id: team.id,
          user_id: session.user.id,
          role: "PRESIDENT",
          status: "ACTIVE",
        });

        // Create default season
        const year = new Date().getFullYear();
        const half = new Date().getMonth() < 6 ? "상반기" : "하반기";
        await db.from("seasons").insert({
          team_id: team.id,
          name: `${year} ${half}`,
          start_date: half === "상반기" ? `${year}-01-01` : `${year}-07-01`,
          end_date: half === "상반기" ? `${year}-06-30` : `${year}-12-31`,
          is_active: true,
        });

        await updateSession({
          teamId: team.id,
          teamName: team.name,
          teamRole: "PRESIDENT",
          inviteCode: team.invite_code,
        });
        redirect("/dashboard");
        return;
      }
    }
  }

  // Demo mode fallback
  await updateSession({
    teamId: nanoid(),
    teamName,
    teamRole: "PRESIDENT",
    inviteCode,
  });
  redirect("/dashboard");
}

export async function joinTeam(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const inviteCode = String(formData.get("inviteCode") || "").trim().toUpperCase();
  if (!inviteCode) redirect("/team");

  if (isSupabaseConfigured() && !session.user.isDemo) {
    const db = getSupabaseAdmin();
    if (db) {
      // Find team by invite code
      const { data: team } = await db
        .from("teams")
        .select("*")
        .eq("invite_code", inviteCode)
        .single();

      if (!team) {
        // Team not found - redirect back with error
        redirect("/team?error=invalid_code");
        return;
      }

      // Check if invite has expired
      if (team.invite_expires_at && new Date(team.invite_expires_at) < new Date()) {
        redirect("/team?error=expired_code");
        return;
      }

      // Check if already a member
      const { data: existing } = await db
        .from("team_members")
        .select("id")
        .eq("team_id", team.id)
        .eq("user_id", session.user.id)
        .single();

      if (existing) {
        await updateSession({
          teamId: team.id,
          teamName: team.name,
          teamRole: "MEMBER",
          inviteCode: team.invite_code,
        });
        redirect("/dashboard");
        return;
      }

      // Determine status based on join mode
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
      return;
    }
  }

  // Demo mode fallback
  await updateSession({
    teamId: nanoid(),
    teamName: inviteCode ? `팀 ${inviteCode}` : "초대 팀",
    teamRole: "MEMBER",
    inviteCode: inviteCode || nanoid(6).toUpperCase(),
  });
  redirect("/dashboard");
}
