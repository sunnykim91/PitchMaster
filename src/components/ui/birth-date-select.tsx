"use client";

import { memo, useMemo, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";

type BirthDateSelectProps = {
  name: string;
  defaultValue?: string; // "YYYY-MM-DD" or "" for optional (no pre-selection)
  required?: boolean;
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1960 + 1 }, (_, i) => 1960 + i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function BirthDateSelectBase({ name, defaultValue = "1998-01-01", required }: BirthDateSelectProps) {
  // defaultValue가 빈 문자열이면 미선택 상태로 시작
  const isEmpty = defaultValue === "";
  const [y, m, d] = isEmpty ? [0, 0, 0] : defaultValue.split("-").map(Number);
  const [year, setYear] = useState(isEmpty ? 0 : (y || 1998));
  const [month, setMonth] = useState(isEmpty ? 0 : (m || 1));
  const [day, setDay] = useState(isEmpty ? 0 : (d || 1));

  const days = useMemo(() => {
    if (!year || !month) return Array.from({ length: 31 }, (_, i) => i + 1);
    const count = daysInMonth(year, month);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [year, month]);

  const adjustedDay = (day && day > days.length) ? days.length : day;
  if (adjustedDay !== day) setDay(adjustedDay);

  // 연/월/일 중 하나라도 미선택이면 빈 문자열 전송
  const value = (year && month && adjustedDay)
    ? `${year}-${String(month).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`
    : "";

  return (
    <div className="flex gap-2">
      <NativeSelect
        value={year || ""}
        onChange={(e) => setYear(Number(e.target.value))}
        className="flex-1"
      >
        <option value="">연도</option>
        {years.map((yr) => (
          <option key={yr} value={yr}>{yr}년</option>
        ))}
      </NativeSelect>
      <NativeSelect
        value={month || ""}
        onChange={(e) => setMonth(Number(e.target.value))}
        className="w-20"
      >
        <option value="">월</option>
        {months.map((mo) => (
          <option key={mo} value={mo}>{mo}월</option>
        ))}
      </NativeSelect>
      <NativeSelect
        value={adjustedDay || ""}
        onChange={(e) => setDay(Number(e.target.value))}
        className="w-20"
      >
        <option value="">일</option>
        {days.map((dd) => (
          <option key={dd} value={dd}>{dd}일</option>
        ))}
      </NativeSelect>
      <input type="hidden" name={name} value={value} />
      {required && <input type="hidden" name={`${name}_required`} value="1" />}
    </div>
  );
}

export const BirthDateSelect = memo(BirthDateSelectBase);
