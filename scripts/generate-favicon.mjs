#!/usr/bin/env node
/**
 * src/app/favicon.ico 생성 — 16x16 + 32x32 + 48x48 multi-resolution ICO.
 *
 * 네이버 서치어드바이저가 /favicon.ico 404를 "접근 불가" 항목으로 잡아서 추가.
 * Next.js App Router는 src/app/favicon.ico를 자동으로 /favicon.ico 라우트로 서빙.
 *
 * sharp는 ICO 출력 미지원이라 PNG 데이터 + ICO 헤더를 직접 합성.
 * ICO 포맷: ICONDIR(6) + ICONDIRENTRY(16 * N) + PNG payload(N개).
 *
 * 실행: node scripts/generate-favicon.mjs
 */
import sharp from "sharp";
import fs from "node:fs";

const SOURCE = "public/icons/icon-192.png";
const OUTPUT = "src/app/favicon.ico";
const SIZES = [16, 32, 48];

const pngs = await Promise.all(
  SIZES.map((size) =>
    sharp(SOURCE).resize(size, size, { fit: "contain" }).png().toBuffer(),
  ),
);

const headerSize = 6 + 16 * SIZES.length;
const header = Buffer.alloc(headerSize);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type = 1 (ICO)
header.writeUInt16LE(SIZES.length, 4); // image count

let dataOffset = headerSize;
SIZES.forEach((size, i) => {
  const entry = 6 + 16 * i;
  header.writeUInt8(size === 256 ? 0 : size, entry); // width (0 = 256)
  header.writeUInt8(size === 256 ? 0 : size, entry + 1); // height
  header.writeUInt8(0, entry + 2); // palette colors
  header.writeUInt8(0, entry + 3); // reserved
  header.writeUInt16LE(1, entry + 4); // color planes
  header.writeUInt16LE(32, entry + 6); // bits per pixel
  header.writeUInt32LE(pngs[i].length, entry + 8); // image size
  header.writeUInt32LE(dataOffset, entry + 12); // image offset
  dataOffset += pngs[i].length;
});

const ico = Buffer.concat([header, ...pngs]);
fs.writeFileSync(OUTPUT, ico);

console.log(`✓ ${OUTPUT} 생성 — ${SIZES.join("x, ")}x multi-res (${ico.length} bytes)`);
