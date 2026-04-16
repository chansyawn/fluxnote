import { invoke } from "@tauri-apps/api/core";
import { createContext, useContext, useEffectEvent, useMemo, type ReactNode } from "react";

import {
  type ShortcutAction,
  type ShortcutBinding,
  type ShortcutPreferences,
} from "@/app/preferences/preferences-schema";
import { useShortcutPreferences } from "@/app/preferences/preferences-store";
import {
  normalizeShortcut,
  type ShortcutUpdateError,
  validateShortcutUpdate,
} from "@/features/shortcut/shortcut-utils";
import { useGlobalShortcutSync } from "@/features/shortcut/use-global-shortcut-sync";

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

async function toggleMainWindowVisibility(): Promise<void> {
  await invoke("toggle_main_window_command");
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
