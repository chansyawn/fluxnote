import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY_THEME = "fluxnote.theme";

export const THEME_MODES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

const themeModeAtom = atomWithStorage<ThemeMode>(STORAGE_KEY_THEME, "system", undefined, {
  getOnInit: true,
});

export function isThemeMode(value: string): value is ThemeMode {
  return (THEME_MODES as readonly string[]).includes(value);
}

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
  const [themeMode, setThemeModeState] = useAtom(themeModeAtom);
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

  const resolvedTheme = themeMode === "system" ? (systemPrefersDark ? "dark" : "light") : themeMode;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      setThemeMode: (nextThemeMode) => {
        setThemeModeState(nextThemeMode);
      },
      resolvedTheme,
    }),
    [resolvedTheme, setThemeModeState, themeMode],
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
