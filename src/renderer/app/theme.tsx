import { useThemePreference } from "@renderer/features/preferences/preferences-query";
import type { ThemePreference } from "@shared/features/preferences/user-preferences";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeMode = ThemePreference;

type ThemeContextValue = {
  themeMode: ThemeMode;
  setThemeMode: (themeMode: ThemeMode) => void;
  resolvedTheme: "light" | "dark";
};

const ThemeStateContext = createContext<ThemeContextValue | null>(null);

type ThemeStateProviderProps = {
  children: ReactNode;
};

export function ThemeStateProvider({ children }: ThemeStateProviderProps) {
  const { theme: themeMode, setTheme: setThemeMode } = useThemePreference();
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => {
      setSystemPrefersDark(mediaQuery.matches);
    };

    updateSystemTheme();
    mediaQuery.addEventListener("change", updateSystemTheme);

    return () => {
      mediaQuery.removeEventListener("change", updateSystemTheme);
    };
  }, []);

  const resolvedTheme = systemPrefersDark ? "dark" : "light";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      setThemeMode,
      resolvedTheme,
    }),
    [resolvedTheme, setThemeMode, themeMode],
  );

  return <ThemeStateContext.Provider value={contextValue}>{children}</ThemeStateContext.Provider>;
}

export function useThemeState() {
  const context = useContext(ThemeStateContext);

  if (!context) {
    throw new Error("useThemeState must be used within ThemeStateProvider");
  }

  return context;
}
