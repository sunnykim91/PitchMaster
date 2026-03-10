import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { updateSession } from "@/lib/auth";

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ profile: null, demo: true });

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

  const body = await request.json();
  const db = getSupabaseAdmin();
  if (!db) return apiSuccess({ demo: true });

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
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
