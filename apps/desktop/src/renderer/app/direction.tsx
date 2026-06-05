import { DirectionProvider } from "@fluxnotes/ui/components/direction";
import { useI18nState } from "@renderer/app/i18n";
import { useEffect, type ReactNode } from "react";

type DirectionState = "ltr" | "rtl";

type DirectionStateProviderProps = {
  children: ReactNode;
};

export function DirectionStateProvider({ children }: DirectionStateProviderProps) {
  const { activeLocale } = useI18nState();
  const direction: DirectionState = activeLocale.rtl ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = direction;
  }, [direction]);

  return <DirectionProvider direction={direction}>{children}</DirectionProvider>;
}
