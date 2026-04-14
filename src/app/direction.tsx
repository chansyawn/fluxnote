import { useEffect, type ReactNode } from "react";

import { useI18nState } from "@/app/i18n";
import { DirectionProvider } from "@/ui/components/direction";

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
