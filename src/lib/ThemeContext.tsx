"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const LIGHT_VARS = `
  --background: 220 14% 96%;
  --foreground: 220 20% 14%;
  --card: 0 0% 100%;
  --card-foreground: 220 20% 14%;
  --popover: 0 0% 100%;
  --popover-foreground: 220 20% 14%;
  --primary: 16 85% 48%;
  --primary-foreground: 0 0% 100%;
  --secondary: 220 12% 91%;
  --secondary-foreground: 220 10% 30%;
  --muted: 220 12% 93%;
  --muted-foreground: 220 8% 42%;
  --accent: 40 65% 46%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 72% 46%;
  --destructive-foreground: 0 0% 100%;
  --border: 220 12% 84%;
  --input: 220 12% 84%;
  --ring: 16 85% 48%;
  --success: 152 60% 34%;
  --warning: 38 90% 44%;
  --info: 210 75% 42%;
  --win: 152 60% 34%;
  --draw: 220 8% 54%;
  --loss: 0 68% 44%;
  --pitch: 152 45% 32%;
  --sidebar-background: 220 14% 94%;
  --sidebar-foreground: 220 20% 14%;
  --sidebar-primary: 16 85% 48%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 220 12% 91%;
  --sidebar-accent-foreground: 220 10% 30%;
  --sidebar-border: 220 12% 84%;
  --sidebar-ring: 16 85% 48%;
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
