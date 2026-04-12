import { cookies } from "next/headers";
import type { Session, SessionUser } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { signSession, verifySession, isSessionSigningConfigured } from "@/lib/sessionSign";

const SESSION_COOKIE = "pm_session";

/**
 * 세션 쿠키 기본 옵션.
 * - httpOnly: JS 접근 차단 (XSS 쿠키 탈취 방지)
 * - sameSite=lax: 크로스사이트 전송 제한 (CSRF 완화)
 * - secure: 프로덕션에서만 true — HTTPS 전용 전송 (MITM/스니핑 방어)
 *   localhost 개발은 HTTP라서 true면 쿠키가 아예 저장 안 되므로 NODE_ENV 분기
 * - path=/: 전역
 */
const SESSION_COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/**
 * 서명된 세션 쿠키를 검증해 Session 객체로 복원.
 * SESSION_SECRET이 없는 환경에서는 null을 반환하고 콘솔에 경고.
 * 기존의 서명 없는 JSON 쿠키는 2026-04-10 배포 이후 무효화됨 (하드 컷오버).
 */
function parseSession(value?: string | null): Session | null {
  if (!value) return null;
  if (!isSessionSigningConfigured()) {
    console.warn("[auth] SESSION_SECRET is not configured — all sessions will be rejected");
    return null;
  }
  const payload = verifySession(value);
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as Session;
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
        const signed = signSession(JSON.stringify(session));
        if (signed) {
          try {
            cookieStore.set(SESSION_COOKIE, signed, {
              ...SESSION_COOKIE_BASE_OPTIONS,
              maxAge: 60 * 60 * 24 * 30,
            });
          } catch {
            // API Route에서는 쿠키 설정 불가할 수 있음 — 무시
          }
        }
      }
    }
  }

  return session;
}

export async function setSession(session: Session) {
  const signed = signSession(JSON.stringify(session));
  if (!signed) {
    throw new Error("SESSION_SECRET is not configured — cannot issue session cookie");
  }
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, signed, {
    ...SESSION_COOKIE_BASE_OPTIONS,
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
    ...SESSION_COOKIE_BASE_OPTIONS,
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
    // 카카오 프로필 이미지가 있으면 DB 업데이트 (추가 동의 후 재로그인 시 반영)
    // 사용자가 직접 업로드한 커스텀 사진은 Supabase Storage URL(uploads/)이라
    // 카카오 이미지(kakaocdn)와 구분 가능 — 커스텀 사진이 없을 때만 카카오 이미지 적용
    let profileImageUrl = existing.profile_image_url;
    const isCustomUpload = existing.profile_image_url && existing.profile_image_url.includes("/uploads/profiles/");
    if (kakaoProfile.profileImage && !isCustomUpload) {
      await db.from("users").update({ profile_image_url: kakaoProfile.profileImage }).eq("id", existing.id);
      profileImageUrl = kakaoProfile.profileImage;
    }

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
        profileImageUrl,
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
