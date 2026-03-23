"use client";

import { memo, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatPhone, stripPhone } from "@/lib/utils";

type PhoneInputProps = Omit<React.ComponentProps<"input">, "onChange" | "value"> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (raw: string) => void;
};

function PhoneInputBase({ value, defaultValue, onValueChange, name, ...props }: PhoneInputProps) {
  const [display, setDisplay] = useState(formatPhone(value ?? defaultValue ?? ""));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setDisplay(formatted);
    onValueChange?.(stripPhone(formatted));
  };

  return (
    <>
      <Input
        {...props}
        type="tel"
        inputMode="numeric"
        value={value !== undefined ? formatPhone(value) : display}
        onChange={handleChange}
        placeholder="010-0000-0000"
      />
      <input type="hidden" name={name} value={stripPhone(value !== undefined ? formatPhone(value) : display)} />
    </>
  );
}

export const PhoneInput = memo(PhoneInputBase);
