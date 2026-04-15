import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseReceiptWithVision } from "@/lib/server/aiOcrParse";

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

  if (session.user.name !== "김선휘") {
    return NextResponse.json({ error: "ai_not_available" }, { status: 403 });
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

    const result = await parseReceiptWithVision(buffer, file.type);

    if (result.source === "error") {
      return NextResponse.json({ error: result.error ?? "AI 파싱 실패" }, { status: 502 });
    }

    return NextResponse.json({
      transactions: result.transactions,
      source: result.source,
      count: result.transactions.length,
    });
  } catch (err) {
    console.error("[/api/ocr/smart] route error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
