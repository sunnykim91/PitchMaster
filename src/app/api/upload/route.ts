import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ url: "/placeholder.jpg", demo: true });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return apiError("file required");

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
