/**
 * mask-ocr-guide.mjs
 *
 * 카카오뱅크 통장 형식의 가짜 데모 SVG → PNG 변환.
 * 실 데이터(이름·금액)를 ○○○로 placeholder 처리해
 * 어떤 화면을 캡처해야 하는지 가이드 효과만 유지.
 *
 * 출력: public/screenshots/ocr-kakaobank.png
 */

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = "public/screenshots";
const OUT = path.join(OUT_DIR, "ocr-kakaobank.png");

const SVG = `
<svg width="720" height="1100" viewBox="0 0 720 1100" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard Variable', system-ui, sans-serif">
  <rect width="720" height="1100" fill="white" />

  <!-- 상단 헤더: ← FCMZ -->
  <text x="40" y="60" font-size="40" font-weight="500" fill="#1a1a1a">←</text>
  <text x="360" y="58" font-size="32" font-weight="600" text-anchor="middle" fill="#1a1a1a">FCMZ</text>

  <!-- 프로필 원 -->
  <circle cx="360" cy="170" r="55" fill="#FFE5E8" />
  <circle cx="338" cy="158" r="14" fill="#3a3a3a" />
  <circle cx="382" cy="158" r="14" fill="#FF8B5A" />
  <circle cx="360" cy="188" r="14" fill="#FFB084" />

  <!-- 잔액 -->
  <text x="360" y="300" font-size="48" font-weight="700" text-anchor="middle" fill="#1a1a1a">○,○○○,○○○원</text>

  <!-- 검색바 -->
  <rect x="40" y="350" width="640" height="70" rx="35" fill="#F2F2F4" />
  <circle cx="80" cy="385" r="14" stroke="#9aa0a6" fill="none" stroke-width="3" />
  <text x="660" y="392" text-anchor="end" font-size="18" fill="#5f6368">3개월 · 전체 · 최신순  ▾</text>

  <!-- 거래 행 1 (04.16) -->
  <text x="40" y="490" font-size="22" font-weight="500" fill="#1a1a1a">04.16</text>
  <text x="40" y="540" font-size="30" fill="#1a1a1a">○○○</text>
  <text x="680" y="540" text-anchor="end" font-size="30" fill="#1a1a1a">-○○,○○○원</text>
  <text x="40" y="578" font-size="19" fill="#80848e">10:48  용마산 구장 예약비</text>
  <text x="680" y="578" text-anchor="end" font-size="19" fill="#80848e">○,○○○,○○○원</text>

  <!-- 거래 행 2 (04.13) -->
  <text x="40" y="660" font-size="22" font-weight="500" fill="#1a1a1a">04.13</text>
  <text x="40" y="710" font-size="30" fill="#1a1a1a">○○○</text>
  <text x="680" y="710" text-anchor="end" font-size="30" fill="#1a1a1a">-○,○○○원</text>
  <text x="40" y="748" font-size="19" fill="#80848e">21:00  음료비</text>
  <text x="680" y="748" text-anchor="end" font-size="19" fill="#80848e">○,○○○,○○○원</text>

  <!-- 거래 행 3 (04.08) -->
  <text x="40" y="830" font-size="22" font-weight="500" fill="#1a1a1a">04.08</text>
  <text x="40" y="880" font-size="30" fill="#1a1a1a">○○○</text>
  <text x="680" y="880" text-anchor="end" font-size="30" fill="#3585d8">○○,○○○원</text>
  <text x="40" y="918" font-size="19" fill="#80848e">22:19  ○○○ 4월 회비</text>
  <text x="680" y="918" text-anchor="end" font-size="19" fill="#80848e">○,○○○,○○○원</text>

  <!-- 거래 행 4 (04.08, 같은 날) -->
  <text x="40" y="990" font-size="30" fill="#1a1a1a">○○○</text>
  <text x="680" y="990" text-anchor="end" font-size="30" fill="#3585d8">○○,○○○원</text>
  <text x="40" y="1028" font-size="19" fill="#80848e">16:48  ○○○ 4월 회비</text>
  <text x="680" y="1028" text-anchor="end" font-size="19" fill="#80848e">○,○○○,○○○원</text>
</svg>
`;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  await sharp(Buffer.from(SVG))
    .png({ compressionLevel: 9 })
    .toFile(OUT);

  const meta = await sharp(OUT).metadata();
  console.log(`저장: ${OUT} (${meta.width}×${meta.height})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
