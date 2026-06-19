import type { Hotkey } from "@fluxnotes/shared";
import { toast } from "@fluxnotes/ui/components/sonner";
import { useLingui } from "@lingui/react";
import {
  requestSystemPermission,
  captureExternalEdit,
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
const ACCESSIBILITY_PERMISSION_REQUEST = { permission: "macos_accessibility" } as const;

interface ShortcutStateProviderProps {
  children: ReactNode;
}

export function ShortcutStateProvider({ children }: ShortcutStateProviderProps) {
  const { i18n } = useLingui();
  const { clearShortcut, resetShortcut, setShortcut, shortcuts } = useShortcutPreferences();

  const handleToggleWindow = useEffectEvent(() => {
    void toggleMainWindowVisibility();
  });
  const handleExternalEdit = useEffectEvent(() => {
    void captureExternalEdit().catch((error: unknown) => {
      const invokeError = toAppInvokeError(error);
      if (invokeError.code === "BUSINESS.ACCESSIBILITY_PERMISSION_REQUIRED") {
        toast.error(
          i18n._({
            id: "shortcut.external-edit.accessibility-permission-required",
            message: "Accessibility permission is required.",
          }),
          {
            action: {
              label: i18n._({
                id: "shortcut.external-edit.accessibility-permission.allow",
                message: "Allow",
              }),
              onClick: () => {
                void requestSystemPermission(ACCESSIBILITY_PERMISSION_REQUEST).catch(
                  (requestError: unknown) => {
                    toast.error(toAppInvokeError(requestError).message);
                  },
                );
              },
            },
          },
        );
        return;
      }
      if (invokeError.code === "BUSINESS.EXTERNAL_EDIT_SELF_TARGET") {
        return;
      }

      toast.error(invokeError.message);
    });
  });

  const toggleWindowShortcutError = useGlobalShortcutSync({
    shortcut: shortcuts["global.toggleWindow"],
    onPressed: handleToggleWindow,
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
      clearShortcut,
      externalEditShortcutError,
      handleExternalEdit,
      i18n,
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
