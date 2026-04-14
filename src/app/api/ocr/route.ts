import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";

const CLOVA_OCR_URL = process.env.CLOVA_OCR_INVOKE_URL;
const CLOVA_OCR_SECRET = process.env.CLOVA_OCR_SECRET_KEY;

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  if (!CLOVA_OCR_URL || !CLOVA_OCR_SECRET) {
    return apiError("OCR 서비스가 설정되지 않았습니다", 503);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;
    if (!file) return apiError("이미지가 필요합니다", 400);

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) return apiError("이미지 크기는 10MB 이하만 가능합니다", 400);
    if (file.size === 0) return apiError("빈 파일입니다", 400);
    const mime = (file.type || "").toLowerCase();
    if (mime && !mime.startsWith("image/")) return apiError("이미지 파일만 업로드 가능합니다", 400);

    // File → base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    // 확장자 추출 (HEIC/HEIF → jpg로 변환, 빈 확장자 → jpg 기본값)
    const rawExt = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() ?? "" : "";
    const mimeType = file.type?.toLowerCase() ?? "";
    let format = rawExt === "jpeg" ? "jpg" : rawExt;
    // HEIC/HEIF는 Clova OCR이 지원 안 할 수 있음 → jpg로 시도
    if (format === "heic" || format === "heif" || mimeType.includes("heic") || mimeType.includes("heif")) {
      format = "jpg";
    }
    // 확장자가 비어있으면 MIME 타입에서 추론
    if (!format) {
      if (mimeType.includes("png")) format = "png";
      else if (mimeType.includes("webp")) format = "webp";
      else format = "jpg"; // 기본값
    }

    const ocrResponse = await fetch(CLOVA_OCR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-OCR-SECRET": CLOVA_OCR_SECRET,
      },
      body: JSON.stringify({
        version: "V2",
        requestId: crypto.randomUUID(),
        timestamp: Date.now(),
        lang: "ko",
        images: [
          {
            format,
            name: file.name,
            data: base64Image,
          },
        ],
      }),
    });

    if (!ocrResponse.ok) {
      const errText = await ocrResponse.text();
      console.error("Clova OCR error:", errText);
      return apiError(`OCR API 오류: ${ocrResponse.status}`, 502);
    }

    const result = await ocrResponse.json();
    const inferResult = result.images?.[0]?.inferResult ?? "UNKNOWN";
    const fields = result.images?.[0]?.fields ?? [];

    if (inferResult === "ERROR") {
      const errorMsg = result.images?.[0]?.message ?? "알 수 없는 오류";
      console.error("[OCR] recognition error:", errorMsg);
      return apiError(`OCR 인식 오류: ${errorMsg}. 다른 이미지로 시도해주세요.`, 422);
    }

    if (fields.length === 0) {
      return apiError("이미지에서 텍스트를 찾지 못했습니다. 통장 거래내역 스크린샷인지 확인해주세요.", 422);
    }

    // fields → 텍스트 추출 (lineBreak 기준으로 줄바꿈)
    const text = fields
      .map((f: { inferText: string; lineBreak: boolean }) =>
        f.inferText + (f.lineBreak ? "\n" : " ")
      )
      .join("");

    return apiSuccess({ text, fields });
  } catch (err) {
    console.error("OCR route error:", err);
    return apiError("OCR 처리 중 오류가 발생했습니다", 500);
  }
}
