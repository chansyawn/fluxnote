import { useFontSizePreference } from "@renderer/features/preferences/preferences-query";
import { useEffect, type ReactNode } from "react";

interface FontSizeStateProviderProps {
  children: ReactNode;
}

export function FontSizeStateProvider({ children }: FontSizeStateProviderProps) {
  const { fontSize } = useFontSizePreference();

  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty("--app-font-size-px", `${fontSize}px`);
    root.style.fontSize = "var(--app-font-size-px)";

    return () => {
      root.style.removeProperty("font-size");
      root.style.removeProperty("--app-font-size-px");
    };
  }, [fontSize]);

  return children;
}
