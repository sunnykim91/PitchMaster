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

    // File → base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    // 확장자 추출
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const format = ext === "jpeg" ? "jpg" : ext;

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
    const fields = result.images?.[0]?.fields ?? [];

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
