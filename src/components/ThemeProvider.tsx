"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as Theme) || "system";
  });
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const systemHandlerRef = useRef<((e: MediaQueryListEvent) => void) | null>(null);

  const resolveAndApply = useCallback((t: Theme) => {
    const resolved = t === "system" ? getSystemTheme() : t;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // 系统主题监听器只注册一次，避免 setTheme 重复添加导致泄漏
  const syncSystemListener = useCallback((t: Theme) => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    if (t === "system" && !systemHandlerRef.current) {
      const handler = () => resolveAndApply("system");
      systemHandlerRef.current = handler;
      mediaQuery.addEventListener("change", handler);
    } else if (t !== "system" && systemHandlerRef.current) {
      mediaQuery.removeEventListener("change", systemHandlerRef.current);
      systemHandlerRef.current = null;
    }
  }, [resolveAndApply]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const savedTheme = (localStorage.getItem("theme") as Theme) || "system";
    setThemeState(savedTheme);
    resolveAndApply(savedTheme);
    syncSystemListener(savedTheme);

    return () => {
      if (systemHandlerRef.current) {
        window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", systemHandlerRef.current);
        systemHandlerRef.current = null;
      }
    };
  }, [resolveAndApply, syncSystemListener]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    resolveAndApply(newTheme);
    syncSystemListener(newTheme);
  }, [resolveAndApply, syncSystemListener]);

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === "light" ? "dark" : "light";
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: "system" as Theme,
      resolvedTheme: "light" as "light" | "dark",
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
}
