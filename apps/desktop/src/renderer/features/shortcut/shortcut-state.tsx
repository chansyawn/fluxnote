import type { Hotkey } from "@fluxnotes/shared";
import { toast } from "@fluxnotes/ui/components/sonner";
import {
  quickCreateBlockAndShowWindow,
  startFocusedExternalEdit,
  toAppInvokeError,
  toggleMainWindowVisibility,
} from "@renderer/clients";
import { useShortcutPreferences } from "@renderer/features/preferences/preferences-query";
import {
  normalizeShortcutBinding,
  type ShortcutBinding,
  type ShortcutPreferences,
  type ShortcutUpdateError,
  validateShortcutUpdate,
} from "@renderer/features/shortcut/shortcut-utils";
import { useGlobalShortcutSync } from "@renderer/features/shortcut/use-global-shortcut-sync";
import { type ShortcutAction } from "@shared/features/preferences/user-preferences";
import { createContext, useContext, useEffectEvent, useMemo, type ReactNode } from "react";

type ShortcutUpdateResult =
  | { ok: true; shortcut: Hotkey }
  | { ok: false; error: ShortcutUpdateError };

interface ShortcutStateContextValue {
  shortcuts: ShortcutPreferences;
  globalShortcutErrors: Partial<Record<ShortcutAction, ShortcutBinding>>;
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
  const handleQuickCreateBlock = useEffectEvent(() => {
    void quickCreateBlockAndShowWindow();
  });
  const handleExternalEdit = useEffectEvent(() => {
    void startFocusedExternalEdit().catch((error: unknown) => {
      toast.error(toAppInvokeError(error).message);
    });
  });

  const toggleWindowShortcutError = useGlobalShortcutSync({
    shortcut: shortcuts["global.toggleWindow"],
    onPressed: handleToggleWindow,
  });
  const quickCreateBlockShortcutError = useGlobalShortcutSync({
    shortcut: shortcuts["global.quickCreateBlock"],
    onPressed: handleQuickCreateBlock,
  });
  const externalEditShortcutError = useGlobalShortcutSync({
    shortcut: shortcuts["global.externalEdit"],
    onPressed: handleExternalEdit,
  });

  const contextValue = useMemo<ShortcutStateContextValue>(
    () => ({
      shortcuts,
      globalShortcutErrors: {
        "global.externalEdit": externalEditShortcutError,
        "global.toggleWindow": toggleWindowShortcutError,
        "global.quickCreateBlock": quickCreateBlockShortcutError,
      },
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

        const normalizedShortcut = normalizeShortcutBinding(shortcut);

        if (!normalizedShortcut) {
          return { ok: false, error: "invalid" };
        }

        setShortcut(action, normalizedShortcut);

        return { ok: true, shortcut: normalizedShortcut };
      },
    }),
    [
      quickCreateBlockShortcutError,
      clearShortcut,
      externalEditShortcutError,
      handleExternalEdit,
      handleQuickCreateBlock,
      resetShortcut,
      setShortcut,
      shortcuts,
      toggleWindowShortcutError,
    ],
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
