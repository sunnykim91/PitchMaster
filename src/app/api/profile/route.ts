import { NextRequest, NextResponse } from "next/server";
import { getApiContext, demoGuard, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { updateSession } from "@/lib/auth";
import { validateSafeName } from "@/lib/validators/safeText";

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  // select("*") intentional: full profile is returned to client and used for session update
  const { data, error } = await db
    .from("users")
    .select("*")
    .eq("id", ctx.userId)
    .single();
  if (error) return apiError(error.message);
  return apiSuccess({ profile: data });
}

export async function PUT(request: NextRequest) {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const demo = demoGuard(ctx);
  if (demo) return demo;

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiError("Database not available", 503);

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const nameCheck = validateSafeName(body.name, { maxLength: 20 });
    if (!nameCheck.ok) return apiError(nameCheck.reason);
    updates.name = nameCheck.value;
  }
  if (body.phone !== undefined) updates.phone = body.phone || null;
  if (body.preferredPositions !== undefined) updates.preferred_positions = body.preferredPositions;
  if (body.preferredFoot !== undefined) updates.preferred_foot = body.preferredFoot;
  if (body.profileImageUrl !== undefined) updates.profile_image_url = body.profileImageUrl || null;

  const { data, error } = await db
    .from("users")
    .update(updates)
    .eq("id", ctx.userId)
    .select()
    .single();
  if (error) return apiError(error.message);

  // Update session cookie with new profile data
  await updateSession({
    name: data.name,
    phone: data.phone,
    preferredPositions: data.preferred_positions,
    preferredFoot: data.preferred_foot,
    profileImageUrl: data.profile_image_url,
  });

  return apiSuccess({ profile: data });
}
