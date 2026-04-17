import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ParsedTransaction, OcrParseResult } from "@/lib/server/aiOcrParse";

/**
 * OCR 결과 이미지 해시 캐시 (TTL 24시간).
 * 같은 이미지 재업로드 시 Claude Vision 호출 생략.
 *
 * 마이그레이션 00030 필요. 테이블 없어도 graceful (캐시 스킵).
 */

const TTL_MS = 24 * 60 * 60 * 1000;

export function hashImage(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex").slice(0, 16);
}

/** 캐시 조회 — hit 시 OcrParseResult 반환, miss 시 null */
export async function getCachedOcrResult(
  imageHash: string,
  teamId: string | null
): Promise<OcrParseResult | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  try {
    let query = db
      .from("ai_ocr_cache")
      .select("transactions, warnings, model, created_at")
      .eq("image_hash", imageHash)
      .gte("created_at", new Date(Date.now() - TTL_MS).toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (teamId) query = query.eq("team_id", teamId);

    const { data, error } = await query;
    if (error || !data || data.length === 0) return null;

    const row = data[0];
    return {
      transactions: (row.transactions as ParsedTransaction[]) ?? [],
      source: "ai",
      model: row.model ?? undefined,
      warnings: (row.warnings as string[] | null) ?? undefined,
    };
  } catch {
    return null;
  }
}

/** 캐시 저장 — 실패 시 조용히 (AI 기능 영향 없음) */
export async function saveCachedOcrResult(
  imageHash: string,
  teamId: string | null,
  result: OcrParseResult
): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db || result.source !== "ai") return;

  try {
    await db.from("ai_ocr_cache").insert({
      image_hash: imageHash,
      team_id: teamId,
      transactions: result.transactions,
      warnings: result.warnings ?? null,
      model: result.model ?? null,
    });
  } catch {
    // 캐시 저장 실패는 무시
  }
}
