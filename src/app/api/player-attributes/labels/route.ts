import { NextResponse } from "next/server";
import { getApiContext, apiError, apiSuccess } from "@/lib/api-helpers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const ctx = await getApiContext();
  if (ctx instanceof NextResponse) return ctx;

  const sb = getSupabaseAdmin();
  if (!sb) return apiError("DB unavailable", 503);

  const [codesRes, labelsRes] = await Promise.all([
    sb
      .from("player_attribute_codes")
      .select("code, name_ko, category, display_order, gk_only, applicable_sports")
      .order("display_order"),
    sb
      .from("player_attribute_labels")
      .select("attribute_code, level, label_ko")
      .order("attribute_code")
      .order("level"),
  ]);

  if (codesRes.error) return apiError(codesRes.error.message, 500);
  if (labelsRes.error) return apiError(labelsRes.error.message, 500);

  return apiSuccess({
    codes: codesRes.data,
    labels: labelsRes.data,
    algorithm: "Triple Trust",
    product: "PitchScore",
  });
}
