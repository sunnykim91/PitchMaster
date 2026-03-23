"use client";

import { memo, useMemo, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";

type BirthDateSelectProps = {
  name: string;
  defaultValue?: string; // "YYYY-MM-DD"
  required?: boolean;
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1960 + 1 }, (_, i) => 1960 + i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function BirthDateSelectBase({ name, defaultValue = "1998-01-01", required }: BirthDateSelectProps) {
  const [y, m, d] = defaultValue.split("-").map(Number);
  const [year, setYear] = useState(y || 1998);
  const [month, setMonth] = useState(m || 1);
  const [day, setDay] = useState(d || 1);

  const days = useMemo(() => {
    const count = daysInMonth(year, month);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [year, month]);

  const adjustedDay = day > days.length ? days.length : day;
  if (adjustedDay !== day) setDay(adjustedDay);

  const value = `${year}-${String(month).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`;

  return (
    <div className="flex gap-2">
      <NativeSelect
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="flex-1"
      >
        {years.map((yr) => (
          <option key={yr} value={yr}>{yr}년</option>
        ))}
      </NativeSelect>
      <NativeSelect
        value={month}
        onChange={(e) => setMonth(Number(e.target.value))}
        className="w-20"
      >
        {months.map((mo) => (
          <option key={mo} value={mo}>{mo}월</option>
        ))}
      </NativeSelect>
      <NativeSelect
        value={adjustedDay}
        onChange={(e) => setDay(Number(e.target.value))}
        className="w-20"
      >
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
