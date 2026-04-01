"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const LIGHT_VARS = `
  --background: 0 0% 98%;
  --foreground: 240 10% 10%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 10%;
  --primary: 16 85% 52%;
  --primary-foreground: 0 0% 100%;
  --secondary: 240 5% 92%;
  --secondary-foreground: 240 5% 35%;
  --muted: 240 5% 94%;
  --muted-foreground: 240 4% 46%;
  --accent: 40 60% 50%;
  --accent-foreground: 240 10% 10%;
  --destructive: 0 72% 50%;
  --destructive-foreground: 0 0% 100%;
  --border: 240 6% 85%;
  --input: 240 6% 85%;
  --ring: 16 85% 52%;
  --success: 152 55% 42%;
  --warning: 38 85% 50%;
  --info: 210 70% 50%;
  --win: 152 55% 42%;
  --draw: 40 20% 50%;
  --loss: 0 65% 50%;
  --pitch: 152 40% 35%;
  --sidebar-background: 0 0% 97%;
  --sidebar-foreground: 240 10% 10%;
  --sidebar-primary: 16 85% 52%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 240 5% 92%;
  --sidebar-accent-foreground: 240 5% 35%;
  --sidebar-border: 240 6% 85%;
  --sidebar-ring: 16 85% 52%;
`;

const STYLE_ID = "pm-theme-light";

function applyTheme(isDark: boolean) {
  // light 모드일 때 style 태그로 CSS 변수 주입
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!isDark) {
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = `:root { ${LIGHT_VARS} }`;
  } else {
    style?.remove();
  }
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "dark",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolved] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved && ["light", "dark", "system"].includes(saved)) {
      setThemeState(saved);
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    function apply() {
      let isDark: boolean;
      if (theme === "dark") isDark = true;
      else if (theme === "light") isDark = false;
      else isDark = mq.matches;

      applyTheme(isDark);
      setResolved(isDark ? "dark" : "light");
    }

    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem("theme", t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
