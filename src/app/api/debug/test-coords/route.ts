import { NextRequest } from "next/server";
import { getCoords } from "@/lib/server/getCoords";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * 카카오 + Supabase 캐시 디버그용 — 동작 확인 후 삭제 예정
 * 호출: /api/debug/test-coords?q=어린이대공원 축구장
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";

  const debug: Record<string, unknown> = {
    query: q,
    kakaoKeyExists: !!process.env.KAKAO_CLIENT_ID,
    kakaoKeyPrefix: (process.env.KAKAO_CLIENT_ID ?? "").slice(0, 4) + "...",
    supabaseAdminExists: !!getSupabaseAdmin(),
  };

  // 1. 카카오 직접 호출 테스트
  try {
    const apiKey = process.env.KAKAO_CLIENT_ID;
    if (apiKey) {
      const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=1`;
      const res = await fetch(url, { headers: { Authorization: `KakaoAK ${apiKey}` } });
      debug.kakaoStatus = res.status;
      debug.kakaoStatusText = res.statusText;
      if (res.ok) {
        const data = await res.json();
        debug.kakaoDocCount = data?.documents?.length ?? 0;
        debug.kakaoFirstDoc = data?.documents?.[0] ?? null;
      } else {
        debug.kakaoError = await res.text();
      }
    } else {
      debug.kakaoError = "KAKAO_CLIENT_ID env var missing";
    }
  } catch (e) {
    debug.kakaoException = String(e);
  }

  // 2. getCoords() 함수 호출 테스트 (캐시 + 카카오 + insert)
  try {
    const result = await getCoords(q);
    debug.getCoordsResult = result;
  } catch (e) {
    debug.getCoordsException = String(e);
  }

  // 3. Supabase 직접 select 테스트
  try {
    const db = getSupabaseAdmin();
    if (db) {
      const { data, error } = await db
        .from("location_coords")
        .select("*")
        .eq("location_name", q)
        .maybeSingle();
      debug.cacheRow = data;
      debug.cacheSelectError = error?.message ?? null;
    }
  } catch (e) {
    debug.cacheSelectException = String(e);
  }

  return Response.json(debug, { status: 200 });
}
