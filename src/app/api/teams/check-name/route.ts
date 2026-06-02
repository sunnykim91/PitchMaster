import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  // 로그인 사용자만 — 미인증 팀명 열거 차단 (팀 생성 흐름은 로그인 후라 영향 없음)
  const session = await auth().catch(() => null);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
