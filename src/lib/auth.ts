import { cookies } from "next/headers";
import type { Session, SessionUser } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const SESSION_COOKIE = "pm_session";

function parseSession(value?: string | null): Session | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Session;
    if (!parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function auth(): Promise<Session | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE)?.value ?? null;
  const session = parseSession(cookie);
  if (!session) return null;

  // DB에서 최신 역할 + 팀 로고를 확인하여 세션과 동기화
  if (session.user.teamId) {
    const db = getSupabaseAdmin();
    if (db) {
      const { data: membership } = await db
        .from("team_members")
        .select("role, teams(logo_url)")
        .eq("user_id", session.user.id)
        .eq("team_id", session.user.teamId)
        .eq("status", "ACTIVE")
        .single();

      let needSync = false;
      if (membership && membership.role !== session.user.teamRole) {
        session.user.teamRole = membership.role;
        needSync = true;
      }
      const teamsRaw = membership?.teams as unknown;
      const teamData = Array.isArray(teamsRaw) ? teamsRaw[0] as { logo_url: string | null } | undefined : teamsRaw as { logo_url: string | null } | null;
      const dbLogoUrl = teamData?.logo_url ?? null;
      if (membership && dbLogoUrl !== (session.user.teamLogoUrl ?? null)) {
        session.user.teamLogoUrl = dbLogoUrl;
        needSync = true;
      }
      if (needSync) {
        try {
          cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
          });
        } catch {
          // API Route에서는 쿠키 설정 불가할 수 있음 — 무시
        }
      }
    }
  }

  return session;
}

export async function setSession(session: Session) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function updateSession(update: Partial<SessionUser>) {
  const cookieStore = await cookies();
  const current = parseSession(cookieStore.get(SESSION_COOKIE)?.value ?? null);
  if (!current) return;
  await setSession({ user: { ...current.user, ...update } });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Check if Supabase / real auth is available */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Check if Kakao OAuth is configured */
export function isKakaoConfigured(): boolean {
  return !!(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET);
}

/**
 * After Kakao OAuth callback, find or create user in Supabase,
 * then build a Session from the DB user record.
 */
export async function findOrCreateKakaoUser(kakaoProfile: {
  id: string;
  nickname: string;
  profileImage?: string;
}): Promise<Session> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("Supabase is not configured");

  // Check existing user
  const { data: existing } = await db
    .from("users")
    .select("*")
    .eq("kakao_id", kakaoProfile.id)
    .single();

  if (existing) {
    // Load team memberships (여러 팀 가능 — 첫 번째를 활성 팀으로)
    const { data: memberships } = await db
      .from("team_members")
      .select("team_id, role, teams(id, name, invite_code, logo_url)")
      .eq("user_id", existing.id)
      .eq("status", "ACTIVE")
      .order("joined_at", { ascending: true });

    const firstMembership = memberships?.[0];
    const team = firstMembership?.teams as { id: string; name: string; invite_code: string; logo_url: string | null } | undefined;

    return {
      user: {
        id: existing.id,
        name: existing.name,
        birthDate: existing.birth_date,
        phone: existing.phone,
        preferredPositions: existing.preferred_positions,
        preferredFoot: existing.preferred_foot,
        profileImageUrl: existing.profile_image_url,
        isProfileComplete: existing.is_profile_complete,
        teamId: team?.id,
        teamName: team?.name,
        teamRole: firstMembership?.role,
        inviteCode: team?.invite_code,
        teamLogoUrl: team?.logo_url ?? null,
      },
    };
  }

  // Create new user
  const { data: newUser, error } = await db
    .from("users")
    .insert({
      kakao_id: kakaoProfile.id,
      name: kakaoProfile.nickname || "사용자",
      profile_image_url: kakaoProfile.profileImage,
      is_profile_complete: false,
    })
    .select()
    .single();

  if (error || !newUser) throw new Error("Failed to create user");

  return {
    user: {
      id: newUser.id,
      name: newUser.name,
      profileImageUrl: newUser.profile_image_url,
      isProfileComplete: false,
    },
  };
}
