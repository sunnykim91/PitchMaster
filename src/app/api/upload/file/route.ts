import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/haansofthwp": "hwp",
  "application/x-hwp": "hwp",
  "application/vnd.hancom.hwp": "hwp",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  // image types also allowed
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// HWP files often come with generic MIME types — allow by extension too
const ALLOWED_EXTENSIONS = new Set([
  "pdf", "hwp", "hwpx", "doc", "docx", "xls", "xlsx",
  "jpg", "jpeg", "png", "webp", "gif",
]);

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return apiError("file required");

  if (file.size > MAX_SIZE) return apiError("파일 크기는 최대 10MB입니다.", 400);

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const isAllowedType = ALLOWED_TYPES[file.type];
  const isAllowedExt = ALLOWED_EXTENSIONS.has(ext);

  if (!isAllowedType && !isAllowedExt) {
    return apiError("허용되지 않는 파일 형식입니다. (PDF, HWP, DOC, DOCX, XLS, XLSX, 이미지)", 400);
  }

  const finalExt = ext || isAllowedType || "bin";
  const path = `${ctx.teamId}/files/${nanoid()}.${finalExt}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await db.storage
    .from("uploads")
    .upload(path, buffer, { contentType: file.type });

  if (error) return apiError(error.message);

  const { data: urlData } = db.storage.from("uploads").getPublicUrl(path);
  return apiSuccess({ url: urlData.publicUrl, fileName: file.name });
}
