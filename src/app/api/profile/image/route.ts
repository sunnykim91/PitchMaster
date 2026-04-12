import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { updateSession } from "@/lib/auth";
import { nanoid } from "nanoid";

/**
 * POST /api/profile/image
 * 프로필 사진 업로드 → Supabase Storage → users.profile_image_url 업데이트 → 세션 갱신
 */
export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const formData = await request.formData();
  const file = formData.get("image") as File | null;
  if (!file) return apiError("image required");

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  if (file.size > MAX_SIZE) return apiError("파일 크기는 5MB 이하만 가능합니다", 400);
  if (!ALLOWED_TYPES.includes(file.type)) return apiError("JPG, PNG, WebP 이미지만 업로드 가능합니다", 400);

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `profiles/${ctx.userId}/${nanoid()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  // Storage 업로드
  const { error: uploadError } = await db.storage
    .from("uploads")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) return apiError(uploadError.message);

  const { data: urlData } = db.storage.from("uploads").getPublicUrl(path);
  const imageUrl = urlData.publicUrl;

  // DB 업데이트
  const { error: dbError } = await db
    .from("users")
    .update({ profile_image_url: imageUrl })
    .eq("id", ctx.userId);

  if (dbError) return apiError(dbError.message);

  // 세션 갱신 (헤더/프로필 영역에서 즉시 반영되도록)
  await updateSession({ profileImageUrl: imageUrl });

  return apiSuccess({ imageUrl });
}
