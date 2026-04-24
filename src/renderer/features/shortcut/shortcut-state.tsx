import {
  type ShortcutAction,
  type ShortcutBinding,
  type ShortcutPreferences,
} from "@renderer/app/preferences/preferences-schema";
import { useShortcutPreferences } from "@renderer/app/preferences/preferences-store";
import { toggleMainWindowVisibility } from "@renderer/clients/window";
import {
  normalizeShortcut,
  type ShortcutUpdateError,
  validateShortcutUpdate,
} from "@renderer/features/shortcut/shortcut-utils";
import { useGlobalShortcutSync } from "@renderer/features/shortcut/use-global-shortcut-sync";
import { createContext, useContext, useEffectEvent, useMemo, type ReactNode } from "react";

type ShortcutUpdateResult = { ok: true } | { ok: false; error: ShortcutUpdateError };

interface ShortcutStateContextValue {
  shortcuts: ShortcutPreferences;
  globalShortcutError: ShortcutBinding;
  clearShortcut: (action: ShortcutAction) => void;
  resetShortcut: (action: ShortcutAction) => void;
  updateShortcut: (action: ShortcutAction, shortcut: string) => ShortcutUpdateResult;
}

const ShortcutStateContext = createContext<ShortcutStateContextValue | null>(null);

interface ShortcutStateProviderProps {
  children: ReactNode;
}

export function ShortcutStateProvider({ children }: ShortcutStateProviderProps) {
  const { clearShortcut, resetShortcut, setShortcut, shortcuts } = useShortcutPreferences();

  const handleToggleWindow = useEffectEvent(() => {
    void toggleMainWindowVisibility();
  });

  const globalShortcutError = useGlobalShortcutSync({
    shortcut: shortcuts["toggle-window"],
    onPressed: handleToggleWindow,
  });

  const contextValue = useMemo<ShortcutStateContextValue>(
    () => ({
      shortcuts,
      globalShortcutError,
      clearShortcut: (action) => {
        clearShortcut(action);
      },
      resetShortcut: (action) => {
        resetShortcut(action);
      },
      updateShortcut: (action, shortcut) => {
        const error = validateShortcutUpdate(action, shortcut, shortcuts);

        if (error) {
          return { ok: false, error };
        }

        const normalizedShortcut = normalizeShortcut(shortcut);

        if (!normalizedShortcut) {
          return { ok: false, error: "invalid" };
        }

        setShortcut(action, normalizedShortcut);

        return { ok: true };
      },
    }),
    [clearShortcut, globalShortcutError, resetShortcut, setShortcut, shortcuts],
  );

  return (
    <ShortcutStateContext.Provider value={contextValue}>{children}</ShortcutStateContext.Provider>
  );
}

export function useShortcutState() {
  const context = useContext(ShortcutStateContext);

  if (!context) {
    throw new Error("useShortcutState must be used within ShortcutStateProvider");
  }

  return context;
}
