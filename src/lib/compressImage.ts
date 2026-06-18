/**
 * 업로드 전 브라우저에서 이미지를 리사이즈·재인코딩해 용량을 줄인다.
 *
 * 배경:
 *   - `/api/upload` 는 5MB 제한, 추가로 Vercel 서버리스 함수는 요청 본문이
 *     4.5MB 를 넘으면 핸들러 도달 전에 413 으로 막는다.
 *   - 요즘 스마트폰 사진(특히 고화질 안드로이드)은 5MB 를 쉽게 넘겨
 *     "사진이 안 올라가는" 주 원인이 된다.
 *
 * 동작:
 *   - 가장 긴 변을 maxDimension 으로 축소(이미 작으면 그대로) 후 JPEG 재인코딩.
 *   - createImageBitmap 의 imageOrientation:"from-image" 로 EXIF 회전 보정.
 *   - GIF(애니메이션)·비이미지·디코딩 실패 시 원본을 그대로 돌려줘 안전.
 *   - 압축 결과가 원본보다 크면 원본 유지.
 */
export async function compressImage(
  file: File,
  opts: { maxDimension?: number; quality?: number } = {},
): Promise<File> {
  const { maxDimension = 1920, quality = 0.82 } = opts;

  // 이미지가 아니거나 애니메이션 GIF 는 건드리지 않음 (canvas 가 첫 프레임만 남김)
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  // 브라우저 API 미지원 환경(SSR 등)이면 원본 반환
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > maxDimension ? maxDimension / longest : 1;
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    // 디코딩 실패(예: 일부 HEIC) 시 원본을 그대로 업로드 시도
    return file;
  }
}
