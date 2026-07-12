/**
 * CSV 생성·다운로드 유틸 — 기록/회비 "내보내기" 공용.
 *
 * 엑셀 한글 호환을 위해 다운로드 시 UTF-8 BOM(U+FEFF)을 붙인다(없으면 엑셀이 CP949로
 * 열어 한글이 깨짐). 순수 함수(csvCell·toCsv)는 테스트 대상, downloadCsv 는 브라우저 전용.
 */

export type CsvValue = string | number | null | undefined;

/** CSV 셀 이스케이프 — 쉼표·큰따옴표·개행 포함 시 큰따옴표로 감싸고 내부 따옴표는 2배로 */
export function csvCell(value: CsvValue): string {
  const s = value == null ? "" : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** 헤더 + 행 → CSV 문자열 (CRLF 구분 — 엑셀 기본) */
export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\r\n");
}

/** 브라우저에서 CSV 파일 다운로드 — UTF-8 BOM 포함(엑셀 한글 대응) */
export function downloadCsv(filename: string, headers: string[], rows: CsvValue[][]): void {
  const csv = toCsv(headers, rows);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // 즉시 revoke 하면 다운로드가 시작되기 전에 blob URL 이 회수돼 취소될 수 있어 지연 정리
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
