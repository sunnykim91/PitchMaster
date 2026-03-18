import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return apiError("file required");

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (file.size > MAX_SIZE) return apiError("File too large (max 5MB)", 400);
  if (!ALLOWED_TYPES.includes(file.type)) return apiError("Only image files allowed", 400);

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${ctx.teamId}/${nanoid()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await db.storage
    .from("uploads")
    .upload(path, buffer, { contentType: file.type });

  if (error) return apiError(error.message);

  const { data: urlData } = db.storage.from("uploads").getPublicUrl(path);
  return apiSuccess({ url: urlData.publicUrl });
}
