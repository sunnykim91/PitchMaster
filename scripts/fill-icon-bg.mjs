#!/usr/bin/env node
/**
 * PWA 아이콘 모서리의 흰색 픽셀을 #0a0c10(다크 배경)으로 변환.
 *
 * 원본 PNG는 알파 투명이 아니라 RGB 255,255,255 흰색이 모서리에 직접 칠해져 있음.
 * flatten() 으로는 안 되고 픽셀 단위 처리 필요.
 *
 * 임계값 240 이상 (거의 흰색) → #0a0c10 (10,12,16) 변환.
 * 아이콘 본 콘텐츠(검정·초록·회색)는 RGB 240 미만이라 영향 없음.
 *
 * 실행: node scripts/fill-icon-bg.mjs
 */
import sharp from "sharp";
import fs from "node:fs";

const TARGET = { r: 10, g: 12, b: 16 }; // manifest.json background_color #0a0c10
const THRESHOLD = 240; // RGB 모두 240 이상이면 흰색으로 간주
const FILES = [
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "public/icons/icon-maskable-192.png",
  "public/icons/icon-maskable-512.png",
];

for (const file of FILES) {
  if (!fs.existsSync(file)) {
    console.error(`✗ not found: ${file}`);
    continue;
  }

  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const newData = Buffer.from(data);
  let replacedCount = 0;

  for (let i = 0; i < data.length; i += ch) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= THRESHOLD && g >= THRESHOLD && b >= THRESHOLD) {
      newData[i] = TARGET.r;
      newData[i + 1] = TARGET.g;
      newData[i + 2] = TARGET.b;
      // 알파 채널 있으면 불투명으로 (4채널 케이스)
      if (ch === 4) newData[i + 3] = 255;
      replacedCount++;
    }
  }

  await sharp(newData, {
    raw: { width: info.width, height: info.height, channels: ch },
  })
    .png()
    .toFile(file);

  const total = (info.width * info.height);
  const pct = ((replacedCount / total) * 100).toFixed(1);
  console.log(`✓ ${file} (${info.width}x${info.height}) — ${replacedCount}/${total} 픽셀 변환 (${pct}%)`);
}

console.log("\n완료. 모서리 흰색 픽셀이 #0a0c10 으로 변환됨.");
