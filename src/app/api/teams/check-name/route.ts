import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json({ available: false, error: "이름을 입력해주세요" });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  const { data } = await db
    .from("teams")
    .select("id")
    .eq("name", name)
    .single();

  return NextResponse.json({ available: !data });
}
