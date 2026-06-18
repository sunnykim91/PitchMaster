import { initializeApp, getApps, getApp, cert, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// 네이티브 FCM 발송 (HTTP v1, firebase-admin 모듈러 API).
// 서비스 계정 키는 FIREBASE_SERVICE_ACCOUNT_B64(base64) 또는 FIREBASE_SERVICE_ACCOUNT(JSON)로 주입.
// 브라우저(웹푸시)와 별개 경로 — 앱(TWA)에 직접 배달되므로 브라우저 비의존.

let _app: App | null = null;
let _initFailed = false;

interface RawServiceAccount {
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

// 줄바꿈·따옴표 이슈 회피용 base64 우선, 없으면 raw JSON 허용.
function loadServiceAccount(): RawServiceAccount | null {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  try {
    if (b64) return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("[NativePush] 서비스 계정 파싱 실패:", e);
  }
  return null;
}

function getFirebaseApp(): App | null {
  if (_app) return _app;
  if (_initFailed) return null;

  const sa = loadServiceAccount();
  if (!sa || !sa.project_id || !sa.client_email || !sa.private_key) {
    _initFailed = true;
    return null;
  }
  try {
    _app = getApps().length
      ? getApp()
      : initializeApp({
          credential: cert({
            projectId: sa.project_id,
            clientEmail: sa.client_email,
            privateKey: sa.private_key,
          }),
        });
    return _app;
  } catch (e) {
    console.error("[NativePush] Firebase init 실패:", e);
    _initFailed = true;
    return null;
  }
}

/**
 * 네이티브 FCM 토큰을 가진 유저들에게 data-only 푸시 발송.
 * data-only 라야 앱이 백그라운드여도 onMessageReceived 에서 아이콘·딥링크를 제어한다.
 * 무효 토큰(410 상당)은 자동 정리.
 */
export async function sendNativePushToUsers(
  userIds: string[],
  opts: { title: string; body: string; url?: string }
): Promise<{ sent: number; failed: number }> {
  const app = getFirebaseApp();
  if (!app || userIds.length === 0) return { sent: 0, failed: 0 };

  const db = getSupabaseAdmin();
  if (!db) return { sent: 0, failed: 0 };

  const { data: tokens } = await db
    .from("native_push_tokens")
    .select("token")
    .in("user_id", userIds);

  if (!tokens || tokens.length === 0) return { sent: 0, failed: 0 };

  const url = opts.url ?? "/dashboard";
  const messaging = getMessaging(app);
  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  await Promise.allSettled(
    tokens.map(async (row) => {
      try {
        await messaging.send({
          token: row.token,
          data: { title: opts.title, body: opts.body, url },
          android: { priority: "high" },
        });
        sent++;
      } catch (err: unknown) {
        failed++;
        const code =
          (err as { errorInfo?: { code?: string } })?.errorInfo?.code ??
          (err as { code?: string })?.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token" ||
          code === "messaging/invalid-argument"
        ) {
          invalidTokens.push(row.token);
        }
      }
    })
  );

  if (invalidTokens.length > 0) {
    await db.from("native_push_tokens").delete().in("token", invalidTokens);
  }

  return { sent, failed };
}
