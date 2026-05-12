import { cookies } from "next/headers";
import type { Session, SessionUser } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { signSession, verifySession, isSessionSigningConfigured } from "@/lib/sessionSign";
import { sanitizeKakaoNickname } from "@/lib/validators/safeText";

const SESSION_COOKIE = "pm_session";

/**
 * auth() DB sync 결과 in-memory 캐시.
 *
 * Why: 매 SSR/API 요청마다 team_members + users 2회 SELECT 발생 → Disk IO 큰 부담.
 *      메모 `feedback_supabase_column_verify.md` 사고와 같은 컨텍스트, 일 22M+ 잠재 요청.
 *      Vercel serverless function 인스턴스 단위로 분리되지만 hot path에선 효과 큼.
 *
 * Trade-off: 권한 변경(역할 부여/팀 로고 변경/프로필 이미지 변경)이 최대 60초 지연 반영.
 *            현실적으로 권한 변경 빈도 낮아 무시 가능.
 *
 * 메모리 무한 증가 방지: 1000개 초과 시 가장 오래된 절반 제거 (LRU-lite).
 */
type AuthCacheValue = { lastSyncMs: number };
const AUTH_SYNC_CACHE = new Map<string, AuthCacheValue>();
const AUTH_SYNC_TTL_MS = 60_000;
const AUTH_CACHE_MAX = 1000;

function rememberAuthSync(key: string): void {
  if (AUTH_SYNC_CACHE.size >= AUTH_CACHE_MAX) {
    // 가장 오래된 절반 제거 (insertion order = oldest first)
    const half = Math.floor(AUTH_CACHE_MAX / 2);
    let i = 0;
    for (const k of AUTH_SYNC_CACHE.keys()) {
      if (i++ >= half) break;
      AUTH_SYNC_CACHE.delete(k);
    }
  }
  AUTH_SYNC_CACHE.set(key, { lastSyncMs: Date.now() });
}

function isAuthSyncFresh(key: string): boolean {
  const v = AUTH_SYNC_CACHE.get(key);
  if (!v) return false;
  return Date.now() - v.lastSyncMs < AUTH_SYNC_TTL_MS;
}

// 카카오가 보내는 프로필 이미지 URL은 http://k.kakaocdn.net/... 형태.
// HTML src에 http://가 그대로 박히면 mixed-content 경고 + Lighthouse Best Practices 깎임.
// next/image가 자동 https 업그레이드하긴 하지만 src 자체를 https로 정규화해 저장.
function normalizeKakaoImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//i, "https://");
}

/**
 * 세션 쿠키 기본 옵션.
 * - httpOnly: JS 접근 차단 (XSS 쿠키 탈취 방지)
 * - sameSite=lax: 크로스사이트 전송 제한 (CSRF 완화)
 * - secure: 프로덕션에서만 true — HTTPS 전용 전송 (MITM/스니핑 방어)
 *   localhost 개발은 HTTP라서 true면 쿠키가 아예 저장 안 되므로 NODE_ENV 분기
 * - path=/: 전역
 * - domain: 프로덕션에서만 .pitch-master.app — www·non-www·서브도메인(TWA 등) 공유
 *   2026-05-02 사고 대응: host-only 쿠키 + Cloudflare www→non-www 강제로 사용자 일괄 로그아웃 발생
 */
const SESSION_COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  domain: process.env.NODE_ENV === "production" ? ".pitch-master.app" : undefined,
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

  // DB에서 최신 역할 + 팀 로고 + 프로필 이미지를 확인하여 세션과 동기화
  // 60초 in-memory 캐시: hot path Disk IO 30~40% 절감 (메모 위 주석 참고)
  if (session.user.teamId) {
    const cacheKey = `${session.user.id}:${session.user.teamId}`;
    if (isAuthSyncFresh(cacheKey)) return session;
    const db = getSupabaseAdmin();
    if (db) {
      const [membershipRes, userRes] = await Promise.all([
        db.from("team_members")
          .select("role, teams(logo_url)")
          .eq("user_id", session.user.id)
          .eq("team_id", session.user.teamId)
          .eq("status", "ACTIVE")
          .single(),
        db.from("users")
          .select("profile_image_url")
          .eq("id", session.user.id)
          .single(),
      ]);
      const membership = membershipRes.data;

      let needSync = false;

      // 프로필 이미지 동기화
      const dbProfileImage = (userRes.data as { profile_image_url: string | null } | null)?.profile_image_url ?? null;
      if (dbProfileImage !== (session.user.profileImageUrl ?? null)) {
        session.user.profileImageUrl = dbProfileImage ?? undefined;
        needSync = true;
      }

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
      // DB sync 완료 — 60초 동안 같은 user+team 조합은 캐시 hit으로 DB skip
      rememberAuthSync(cacheKey);
    }
  }

  return session;
}

/**
 * 권한·로고·프로필 변경 직후 캐시 무효화. 변경 endpoint 측에서 호출하면
 * 최대 60초 지연 없이 즉시 반영됨.
 */
export function invalidateAuthSync(userId: string, teamId: string): void {
  AUTH_SYNC_CACHE.delete(`${userId}:${teamId}`);
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
  signupSource?: string | null;
}): Promise<{ session: Session; isNewUser: boolean }> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("Supabase is not configured");

  // 차단/탈퇴 처리된 카카오 ID 사전 체크 — 새 row 생성 흐름 진입 전 거부.
  //   deleted_at IS NOT NULL = 자발적 탈퇴 (14일 후 hard-delete → 재가입 가능)
  //   is_banned = true       = 영구 차단 (hard-delete cron 에서도 제외, 38차 보안 사고 대응)
  const { data: blocked } = await db
    .from("users")
    .select("id, deleted_at, is_banned")
    .eq("kakao_id", kakaoProfile.id)
    .or("deleted_at.not.is.null,is_banned.eq.true")
    .maybeSingle();
  if (blocked) {
    throw new Error("ACCOUNT_BLOCKED");
  }

  // Check existing user (탈퇴자 제외)
  // 🔴 deleted_at IS NOT NULL 이면 탈퇴 상태 — 위에서 이미 차단됨.
  const { data: existing } = await db
    .from("users")
    .select("*")
    .eq("kakao_id", kakaoProfile.id)
    .is("deleted_at", null)
    .single();

  if (existing) {
    // 카카오 프로필 이미지가 있으면 DB 업데이트 (추가 동의 후 재로그인 시 반영)
    // 사용자가 직접 업로드한 커스텀 사진은 Supabase Storage URL(uploads/)이라
    // 카카오 이미지(kakaocdn)와 구분 가능 — 커스텀 사진이 없을 때만 카카오 이미지 적용
    let profileImageUrl = existing.profile_image_url;
    const isCustomUpload = existing.profile_image_url && existing.profile_image_url.includes("/uploads/profiles/");
    const normalizedKakaoImage = normalizeKakaoImageUrl(kakaoProfile.profileImage);
    if (normalizedKakaoImage && !isCustomUpload) {
      await db.from("users").update({ profile_image_url: normalizedKakaoImage }).eq("id", existing.id);
      profileImageUrl = normalizedKakaoImage;
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
      session: {
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
      },
      isNewUser: false,
    };
  }

  // Create new user — signup_source 는 카카오 콜백에서 쿠키로 전달됨 (first-touch attribution)
  const { data: newUser, error } = await db
    .from("users")
    .insert({
      kakao_id: kakaoProfile.id,
      name: sanitizeKakaoNickname(kakaoProfile.nickname),
      profile_image_url: normalizeKakaoImageUrl(kakaoProfile.profileImage),
      is_profile_complete: false,
      signup_source: kakaoProfile.signupSource ?? null,
    })
    .select()
    .single();

  if (error || !newUser) throw new Error("Failed to create user");

  return {
    session: {
      user: {
        id: newUser.id,
        name: newUser.name,
        profileImageUrl: newUser.profile_image_url,
        isProfileComplete: false,
      },
    },
    isNewUser: true,
  };
}
