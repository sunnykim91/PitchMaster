/* ── 한국 주요 장소 → 좌표 매핑 ── */
const LOCATION_COORDS: Record<string, { lat: number; lon: number }> = {
  서울: { lat: 37.5665, lon: 126.978 },
  강남: { lat: 37.4979, lon: 127.0276 },
  잠실: { lat: 37.5145, lon: 127.1 },
  상암: { lat: 37.5775, lon: 126.8855 },
  마포: { lat: 37.5547, lon: 126.9083 },
  영등포: { lat: 37.5264, lon: 126.8963 },
  송파: { lat: 37.5146, lon: 127.1059 },
  광명: { lat: 37.4786, lon: 126.8646 },
  성남: { lat: 37.4201, lon: 127.1265 },
  분당: { lat: 37.3825, lon: 127.1192 },
  수원: { lat: 37.2636, lon: 127.0286 },
  용인: { lat: 37.2411, lon: 127.1776 },
  인천: { lat: 37.4563, lon: 126.7052 },
  부산: { lat: 35.1796, lon: 129.0756 },
  대구: { lat: 35.8714, lon: 128.6014 },
  대전: { lat: 36.3504, lon: 127.3845 },
  광주: { lat: 35.1595, lon: 126.8526 },
  일산: { lat: 37.6584, lon: 126.832 },
  고양: { lat: 37.6584, lon: 126.832 },
  파주: { lat: 37.76, lon: 126.78 },
  안양: { lat: 37.3943, lon: 126.9568 },
};

const DEFAULT_COORDS = { lat: 37.5665, lon: 126.978 };

const ICON_MAP: Record<string, string> = {
  Clear: "\u2600\uFE0F",
  Clouds: "\u2601\uFE0F",
  Rain: "\uD83C\uDF27\uFE0F",
  Drizzle: "\uD83C\uDF26\uFE0F",
  Thunderstorm: "\u26C8\uFE0F",
  Snow: "\u2744\uFE0F",
  Mist: "\uD83C\uDF2B\uFE0F",
  Fog: "\uD83C\uDF2B\uFE0F",
  Haze: "\uD83C\uDF2B\uFE0F",
  Smoke: "\uD83C\uDF2B\uFE0F",
  Dust: "\uD83C\uDF2B\uFE0F",
  Sand: "\uD83C\uDF2B\uFE0F",
  Ash: "\uD83C\uDF2B\uFE0F",
  Squall: "\uD83D\uDCA8",
  Tornado: "\uD83C\uDF2A\uFE0F",
};

const DESC_MAP: Record<string, string> = {
  Clear: "맑음",
  Clouds: "흐림",
  Rain: "비",
  Drizzle: "이슬비",
  Thunderstorm: "뇌우",
  Snow: "눈",
  Mist: "안개",
  Fog: "짙은 안개",
  Haze: "연무",
  Smoke: "연기",
  Dust: "먼지",
  Sand: "모래바람",
  Ash: "화산재",
  Squall: "돌풍",
  Tornado: "토네이도",
};

function resolveCoords(location: string): { lat: number; lon: number } {
  for (const [keyword, coords] of Object.entries(LOCATION_COORDS)) {
    if (location.includes(keyword)) return coords;
  }
  return DEFAULT_COORDS;
}

function getFallbackWeather(date: string) {
  const month = new Date(date).getMonth();
  const avgTemps = [-2, 1, 6, 13, 18, 23, 26, 26, 22, 15, 7, 0];
  const temp = avgTemps[month] ?? 15;
  return {
    temp,
    description: "예보 참고",
    humidity: 50,
    windSpeed: 2.5,
    icon: temp <= 0 ? "\u2744\uFE0F" : temp >= 25 ? "\u2600\uFE0F" : "\u26C5",
  };
}

export type WeatherData = {
  temp: number;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
};

/**
 * 날씨 데이터 조회 (서버사이드)
 * - 과거 경기/5일 초과: null
 * - API 키 없거나 실패: fallback (월별 평균 기온)
 */
export async function getWeatherData(date: string, location: string): Promise<WeatherData | null> {
  if (!date) return null;

  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayStr = nowKST.toISOString().slice(0, 10);

  if (date < todayStr) return null;

  const diffDays = Math.ceil(
    (new Date(date).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays > 5) return null;

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  const coords = resolveCoords(location);

  if (!apiKey) return getFallbackWeather(date);

  try {
    if (diffDays === 0) {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric&lang=kr`,
        { next: { revalidate: 3600 } }
      );
      if (!res.ok) return getFallbackWeather(date);
      const data = await res.json();
      const main = data.weather?.[0]?.main ?? "Clear";
      return {
        temp: Math.round(data.main.temp),
        description: DESC_MAP[main] ?? data.weather?.[0]?.description ?? "알 수 없음",
        humidity: data.main.humidity,
        windSpeed: Math.round((data.wind?.speed ?? 0) * 10) / 10,
        icon: ICON_MAP[main] ?? "\u2600\uFE0F",
      };
    }

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric&lang=kr`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return getFallbackWeather(date);
    const data = await res.json();
    const queryDate = new Date(new Date(todayStr).getTime() + diffDays * 86400000);
    const targetDateStr = queryDate.toISOString().slice(0, 10);
    const noonEntry =
      data.list?.find((item: { dt_txt: string }) =>
        item.dt_txt.startsWith(targetDateStr) && item.dt_txt.includes("12:")
      ) ?? data.list?.find((item: { dt_txt: string }) => item.dt_txt.startsWith(targetDateStr));

    if (!noonEntry) return getFallbackWeather(date);

    const main = noonEntry.weather?.[0]?.main ?? "Clear";
    return {
      temp: Math.round(noonEntry.main.temp),
      description: DESC_MAP[main] ?? noonEntry.weather?.[0]?.description ?? "알 수 없음",
      humidity: noonEntry.main.humidity,
      windSpeed: Math.round((noonEntry.wind?.speed ?? 0) * 10) / 10,
      icon: ICON_MAP[main] ?? "\u2600\uFE0F",
    };
  } catch {
    return getFallbackWeather(date);
  }
}
