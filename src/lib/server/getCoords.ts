/**
 * 구장명 → 좌표 변환 (서버사이드 전용)
 *
 * 흐름:
 * 1. Supabase location_coords 조회 (캐시 HIT)
 * 2. MISS → 카카오 로컬 API 호출 → 결과 캐시 저장
 * 3. 카카오 실패 → null 반환 (호출자가 fallback 처리)
 *
 * 카카오 로컬 API:
 *   GET https://dapi.kakao.com/v2/local/search/keyword.json?query={장소명}&size=1
 *   Header: Authorization: KakaoAK {REST_API_KEY}
 *
 * 응답 (예시):
 *   { documents: [{ place_name, address_name, road_address_name, x: "127.0719", y: "37.5159" }] }
 *   - x: 경도 (longitude)
 *   - y: 위도 (latitude)
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type Coords = {
  lat: number;
  lon: number;
  placeName?: string;
  address?: string;
};

const KAKAO_LOCAL_API = "https://dapi.kakao.com/v2/local/search/keyword.json";

/** 카카오 로컬 API 호출 — 실패 시 null */
async function searchKakao(query: string): Promise<Coords | null> {
  const apiKey = process.env.KAKAO_CLIENT_ID;
  if (!apiKey) return null;

  try {
    const url = `${KAKAO_LOCAL_API}?query=${encodeURIComponent(query)}&size=1`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      // 카카오는 변경 거의 없으므로 응답 캐싱 (1시간)
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const doc = data?.documents?.[0];
    if (!doc?.x || !doc?.y) return null;
    return {
      lat: parseFloat(doc.y),
      lon: parseFloat(doc.x),
      placeName: doc.place_name ?? undefined,
      address: doc.road_address_name ?? doc.address_name ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * 구장명·장소명을 좌표로 변환. 캐시 우선, 미스 시 카카오 호출 + 캐시 저장.
 * 빈 문자열·null 입력은 null 반환.
 */
export async function getCoords(location: string | null | undefined): Promise<Coords | null> {
  if (!location || !location.trim()) return null;
  const normalized = location.trim();

  const db = getSupabaseAdmin();
  if (!db) {
    // Supabase 없으면 캐시 없이 직접 호출
    return searchKakao(normalized);
  }

  // 1. 캐시 조회
  const { data: cached } = await db
    .from("location_coords")
    .select("lat, lon, place_name, address")
    .eq("location_name", normalized)
    .maybeSingle();

  if (cached) {
    return {
      lat: Number(cached.lat),
      lon: Number(cached.lon),
      placeName: cached.place_name ?? undefined,
      address: cached.address ?? undefined,
    };
  }

  // 2. 카카오 호출
  const fresh = await searchKakao(normalized);
  if (!fresh) return null;

  // 3. 캐시 저장 (실패해도 호출자에게는 영향 X)
  try {
    await db.from("location_coords").insert({
      location_name: normalized,
      lat: fresh.lat,
      lon: fresh.lon,
      place_name: fresh.placeName ?? null,
      address: fresh.address ?? null,
    });
  } catch {
    /* 캐시 저장 실패 무시 — 다음 호출에서 재시도 */
  }

  return fresh;
}
