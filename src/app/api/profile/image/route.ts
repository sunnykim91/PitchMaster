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

  // 교체 전 기존 이미지 URL 확보 — 업로드 성공 후 옛 Storage 파일 삭제(고아 누적 방지)용
  const { data: prevUser } = await db.from("users").select("profile_image_url").eq("id", ctx.userId).single();
  const prevImageUrl = (prevUser?.profile_image_url as string | null) ?? null;

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

  // 이전 Storage 파일 삭제 — 우리 'uploads' 버킷의 본인 프로필 경로일 때만 (카카오 CDN URL 등 외부 주소는 제외)
  if (prevImageUrl && prevImageUrl.includes("/uploads/")) {
    const prevPath = prevImageUrl.split("/uploads/")[1]?.split("?")[0];
    if (prevPath && prevPath.startsWith(`profiles/${ctx.userId}/`)) {
      try { await db.storage.from("uploads").remove([prevPath]); } catch { /* 고아 삭제 실패는 무시 */ }
    }
  }

  // 세션 갱신 (헤더/프로필 영역에서 즉시 반영되도록)
  await updateSession({ profileImageUrl: imageUrl });

  return apiSuccess({ imageUrl });
}

/**
 * DELETE /api/profile/image
 * 프로필 사진 삭제 → users.profile_image_url = null → 세션 갱신
 */
export async function DELETE() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const { error } = await db
    .from("users")
    .update({ profile_image_url: null })
    .eq("id", ctx.userId);

  if (error) return apiError(error.message);

  await updateSession({ profileImageUrl: undefined });

  return apiSuccess({ ok: true });
}
