"use server";

import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { auth, updateSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { validateSafeName } from "@/lib/validators/safeText";

export async function createTeam(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.isDemo) redirect("/team?error=demo_blocked");

  const rawTeamName = String(formData.get("teamName") || "").trim() || "우리 팀";
  const teamNameCheck = validateSafeName(rawTeamName, { maxLength: 30, minLength: 2, fieldLabel: "팀 이름", requireMeaningful: true });
  if (!teamNameCheck.ok) {
    redirect("/team?error=invalid_name");
    return;
  }
  const teamName = teamNameCheck.value;
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
  redirect(`/dashboard?welcome=created&team=${encodeURIComponent(team.name)}&code=${encodeURIComponent(team.invite_code)}`);
}

export async function requestJoinTeam(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.isDemo) redirect("/team?error=demo_blocked");

  const teamId = String(formData.get("teamId") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!teamId) redirect("/team");

  const db = getSupabaseAdmin();
  if (!db) throw new Error("Database not configured");

  // 사용자 정보 조회 (kakao_id 필수)
  const { data: user } = await db
    .from("users")
    .select("kakao_id, name, phone, preferred_positions")
    .eq("id", session.user.id)
    .single();

  if (!user?.kakao_id) redirect("/login");

  // 이미 소속인지 체크
  const { data: existingMember } = await db
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", session.user.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (existingMember) {
    redirect("/team?error=already_member");
    return;
  }

  // 기존 PENDING 신청 체크
  const { data: existingRequest } = await db
    .from("team_join_requests")
    .select("id, status")
    .eq("team_id", teamId)
    .eq("kakao_id", user.kakao_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingRequest?.status === "PENDING") {
    redirect("/team?error=already_requested");
    return;
  }

  const userName = user.name ?? session.user.name ?? "사용자";
  const userPhone = user.phone ?? null;
  const preferredPosition = user.preferred_positions?.[0] ?? null;

  if (existingRequest?.status === "REJECTED") {
    // 재신청: PENDING으로 업데이트
    await db
      .from("team_join_requests")
      .update({
        status: "PENDING",
        name: userName,
        phone: userPhone,
        preferred_position: preferredPosition,
        message: message || null,
        reviewed_by: null,
        reviewed_at: null,
      })
      .eq("id", existingRequest.id);
  } else {
    // 신규 신청
    await db.from("team_join_requests").insert({
      team_id: teamId,
      kakao_id: user.kakao_id,
      name: userName,
      phone: userPhone,
      preferred_position: preferredPosition,
      message: message || null,
    });
  }

  redirect("/team?pending=true");
}

export async function joinTeam(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.isDemo) redirect("/team?error=demo_blocked");

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
    redirect(`/dashboard?welcome=joined&team=${encodeURIComponent(team.name)}&method=auto_link`);
    return;
  }

  // MANUAL 팀: team_join_requests로 일원화 (회장 가입 신청 목록에서 승인 필요)
  if (team.join_mode === "MANUAL") {
    const { data: userInfo } = await db
      .from("users")
      .select("kakao_id, name, phone, preferred_positions")
      .eq("id", session.user.id)
      .single();

    if (!userInfo?.kakao_id) {
      redirect("/team?error=user_not_found");
      return;
    }

    const applicantName = userInfo.name ?? session.user.name ?? "사용자";
    const applicantPhone = userInfo.phone ?? null;
    const applicantPosition = userInfo.preferred_positions?.[0] ?? null;

    // 기존 신청 내역 확인 (PENDING이면 그대로, REJECTED면 재활성)
    const { data: prevRequest } = await db
      .from("team_join_requests")
      .select("id, status")
      .eq("team_id", team.id)
      .eq("kakao_id", userInfo.kakao_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevRequest?.status === "PENDING") {
      redirect("/team?pending=true");
      return;
    }

    if (prevRequest?.status === "REJECTED") {
      await db
        .from("team_join_requests")
        .update({
          status: "PENDING",
          name: applicantName,
          phone: applicantPhone,
          preferred_position: applicantPosition,
          reviewed_by: null,
          reviewed_at: null,
        })
        .eq("id", prevRequest.id);
    } else {
      await db.from("team_join_requests").insert({
        team_id: team.id,
        kakao_id: userInfo.kakao_id,
        name: applicantName,
        phone: applicantPhone,
        preferred_position: applicantPosition,
      });
    }

    redirect("/team?pending=true");
    return;
  }

  // AUTO 팀: 즉시 ACTIVE 멤버로 등록
  await db.from("team_members").insert({
    team_id: team.id,
    user_id: session.user.id,
    role: "MEMBER",
    status: "ACTIVE",
  });

  await updateSession({
    teamId: team.id,
    teamName: team.name,
    teamRole: "MEMBER",
    inviteCode: team.invite_code,
  });
  redirect(`/dashboard?welcome=joined&team=${encodeURIComponent(team.name)}&method=invite_code`);
}
