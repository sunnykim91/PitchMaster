import crypto from "crypto";

/**
 * 세션 쿠키 HMAC 서명/검증.
 *
 * 형식: `<base64url(payload)>.<base64url(signature)>`
 * - payload: JSON.stringify된 세션 문자열
 * - signature: HMAC-SHA256(payload, SESSION_SECRET)
 *
 * SESSION_SECRET이 없으면 sign/verify가 모두 null을 반환 → 호출부에서 graceful 처리.
 */

function getSecret(): string | null {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) return null;
  return s;
}

function toBase64Url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b.toString("base64url");
}

function fromBase64Url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

/** payload 문자열에 HMAC 서명을 붙여 쿠키 값으로 만든다. 실패 시 null */
export function signSession(payload: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const sig = crypto.createHmac("sha256", secret).update(payload, "utf8").digest();
  return `${toBase64Url(payload)}.${toBase64Url(sig)}`;
}

/**
 * 서명된 쿠키 값을 검증해 payload 문자열을 돌려준다.
 * - 형식 불일치 / 서명 불일치 / 시크릿 미설정 → null
 * - 타이밍 공격 방지 위해 crypto.timingSafeEqual 사용
 */
export function verifySession(cookie: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  if (!cookie || typeof cookie !== "string") return null;
  const dot = cookie.indexOf(".");
  if (dot <= 0 || dot === cookie.length - 1) return null;
  const payloadB64 = cookie.slice(0, dot);
  const sigB64 = cookie.slice(dot + 1);
  let payloadBuf: Buffer;
  let sigBuf: Buffer;
  try {
    payloadBuf = fromBase64Url(payloadB64);
    sigBuf = fromBase64Url(sigB64);
  } catch {
    return null;
  }
  const expected = crypto.createHmac("sha256", secret).update(payloadBuf).digest();
  if (sigBuf.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expected)) return null;
  return payloadBuf.toString("utf8");
}

/** 개발 편의: 시크릿 설정 여부 */
export function isSessionSigningConfigured(): boolean {
  return getSecret() !== null;
}
