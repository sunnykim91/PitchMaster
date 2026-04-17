import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseReceiptWithVision } from "@/lib/server/aiOcrParse";
import { checkRateLimit } from "@/lib/server/aiUsageLog";
import { getCachedOcrResult, saveCachedOcrResult, hashImage } from "@/lib/server/aiOcrCache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/ocr/smart
 * Claude Haiku Vision으로 통장 거래내역 이미지 → 구조화된 거래 JSON 배열 반환.
 *
 * Phase 3 Feature Flag: 김선휘 계정만 사용 가능 (비용 통제).
 *
 * Request: multipart/form-data
 *   - image: File (최대 10MB)
 * Response:
 *   - 200: { transactions: [...], source: "ai" }
 *   - 400: 입력 오류
 *   - 403: AI 기능 비활성
 *   - 502: AI 호출 실패
 */
export async function POST(request: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Phase B: Feature Flag 해제 — 모든 팀에 AI OCR 공개.
  // 레이트리밋(user 20/team 100 per day) + 이미지 해시 캐시로 비용 안전권.

  // 레이트리밋 체크
  const rate = await checkRateLimit("ocr", session.user.id, session.user.teamId ?? null);
  if (!rate.allowed) {
    return NextResponse.json({
      error: "rate_limited",
      reason: rate.reason,
      count: rate.userCount ?? rate.teamCount,
      cap: rate.cap,
      message: rate.reason === "user_cap"
        ? `OCR은 하루 ${rate.cap}회까지만 사용 가능합니다.`
        : `팀 OCR 일일 한도 ${rate.cap}회에 도달했습니다.`,
    }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "이미지가 필요합니다" }, { status: 400 });
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "이미지 크기는 10MB 이하" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "빈 파일" }, { status: 400 });
    }

    const mime = (file.type || "").toLowerCase();
    if (mime && !mime.startsWith("image/")) {
      return NextResponse.json({ error: "이미지 파일만 가능" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 캐시 조회 (이미지 해시 기준, 팀 경계 유지)
    const imageHash = hashImage(buffer);
    const cached = await getCachedOcrResult(imageHash, session.user.teamId ?? null);
    if (cached) {
      return NextResponse.json({
        transactions: cached.transactions,
        source: cached.source,
        count: cached.transactions.length,
        warnings: cached.warnings,
        cached: true,
      });
    }

    // 팀 멤버 이름 리스트 조회 — Vision이 한글 이름 오인식(종/중 등) 시 fuzzy matching에 사용
    let teamMemberNames: string[] | undefined;
    const db = getSupabaseAdmin();
    if (db && session.user.teamId) {
      const { data: members } = await db
        .from("team_members")
        .select("pre_name, users(name)")
        .eq("team_id", session.user.teamId)
        .in("status", ["ACTIVE", "DORMANT"]);
      if (members) {
        teamMemberNames = members
          .map((m) => {
            const u = Array.isArray(m.users) ? m.users[0] : m.users;
            return (u?.name ?? m.pre_name ?? "").trim();
          })
          .filter((n): n is string => !!n);
      }
    }

    const result = await parseReceiptWithVision(buffer, file.type, {
      userId: session.user.id,
      teamId: session.user.teamId ?? null,
      teamMemberNames,
    });

    if (result.source === "error") {
      return NextResponse.json({ error: result.error ?? "AI 파싱 실패" }, { status: 502 });
    }

    // 성공 시 캐시 저장 (fire-and-forget)
    saveCachedOcrResult(imageHash, session.user.teamId ?? null, result).catch(() => {});

    return NextResponse.json({
      transactions: result.transactions,
      source: result.source,
      count: result.transactions.length,
      warnings: result.warnings,
      cached: false,
    });
  } catch (err) {
    console.error("[/api/ocr/smart] route error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
