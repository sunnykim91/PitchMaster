"use client";

import { useEffect, useRef, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);
  const initialRef = useRef(initialValue);

  useEffect(() => {
    initialRef.current = initialValue;
  }, [initialValue]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(key);
    if (stored) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValue(JSON.parse(stored) as T);
      } catch {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValue(initialRef.current);
      }
    } else {
      window.localStorage.setItem(key, JSON.stringify(initialRef.current));
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, ready, value]);

  return [value, setValue, ready] as const;
}
