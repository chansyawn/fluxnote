import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

import { useI18nState } from "@/app/i18n";
import { DirectionProvider } from "@/ui/components/direction";

const STORAGE_KEY_RTL = "fluxnote.rtl";

const rtlAtom = atomWithStorage<boolean>(STORAGE_KEY_RTL, false, undefined, {
  getOnInit: true,
});

type DirectionState = "ltr" | "rtl";

type DirectionContextValue = {
  direction: DirectionState;
  rtlEnabled: boolean;
  setRtlEnabled: (rtlEnabled: boolean) => void;
};

const DirectionStateContext = createContext<DirectionContextValue | null>(null);

type DirectionStateProviderProps = {
  children: ReactNode;
};

export function DirectionStateProvider({ children }: DirectionStateProviderProps) {
  const [rtlEnabled, setRtlEnabledState] = useAtom(rtlAtom);
  const { activeLocale, isPseudoLocale } = useI18nState();

  const direction: DirectionState =
    activeLocale.rtl || (import.meta.env.DEV && isPseudoLocale && rtlEnabled) ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = direction;
  }, [direction]);

  const contextValue = useMemo<DirectionContextValue>(
    () => ({
      direction,
      rtlEnabled,
      setRtlEnabled: (nextRtlEnabled) => {
        setRtlEnabledState(nextRtlEnabled);
      },
    }),
    [direction, rtlEnabled, setRtlEnabledState],
  );

  return (
    <DirectionStateContext.Provider value={contextValue}>
      <DirectionProvider direction={direction}>{children}</DirectionProvider>
    </DirectionStateContext.Provider>
  );
}

export function useDirectionState() {
  const context = useContext(DirectionStateContext);

  if (!context) {
    throw new Error("useDirectionState must be used within DirectionStateProvider");
  }

  return context;
}
