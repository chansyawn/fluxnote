import { getCurrentWindow } from "@tauri-apps/api/window";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_SHORTCUT_PREFERENCES,
  SHORTCUT_STORAGE_KEY,
  normalizeShortcut,
  type ShortcutBinding,
  type ShortcutAction,
  type ShortcutPreferences,
  type ShortcutUpdateError,
  validateShortcutUpdate,
} from "@/features/shortcut/shortcut-utils";

const appWindow = getCurrentWindow();

const shortcutPreferencesAtom = atomWithStorage<ShortcutPreferences>(
  SHORTCUT_STORAGE_KEY,
  DEFAULT_SHORTCUT_PREFERENCES,
  undefined,
  { getOnInit: true },
);

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
  const isVisible = await appWindow.isVisible();

  if (isVisible) {
    await appWindow.hide();
    return;
  }

  await appWindow.unminimize();
  await appWindow.show();
  await appWindow.setFocus();
}

export function ShortcutStateProvider({ children }: ShortcutStateProviderProps) {
  const [shortcuts, setShortcuts] = useAtom(shortcutPreferencesAtom);
  const [globalShortcutError, setGlobalShortcutError] = useState<ShortcutBinding>(null);

  const handleToggleWindow = useEffectEvent(() => {
    void toggleMainWindowVisibility();
  });

  useEffect(() => {
    let isActive = true;
    const normalizedGlobalShortcut = normalizeShortcut(shortcuts["toggle-window"] ?? "");

    setGlobalShortcutError(null);

    const syncGlobalShortcut = async () => {
      if (!normalizedGlobalShortcut) {
        return;
      }

      try {
        await unregister(normalizedGlobalShortcut).catch(() => {});
        await register(normalizedGlobalShortcut, (event) => {
          if (event.state !== "Pressed") {
            return;
          }

          handleToggleWindow();
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error("Failed to register global shortcut", error);
        setGlobalShortcutError(normalizedGlobalShortcut);
      }
    };

    void syncGlobalShortcut();

    return () => {
      isActive = false;
      if (!normalizedGlobalShortcut) {
        return;
      }

      void unregister(normalizedGlobalShortcut).catch(() => {});
    };
  }, [handleToggleWindow, shortcuts["toggle-window"]]);

  const contextValue = useMemo<ShortcutStateContextValue>(
    () => ({
      shortcuts,
      globalShortcutError,
      clearShortcut: (action) => {
        setShortcuts((currentShortcuts) => ({
          ...currentShortcuts,
          [action]: null,
        }));
      },
      resetShortcut: (action) => {
        setShortcuts((currentShortcuts) => ({
          ...currentShortcuts,
          [action]: DEFAULT_SHORTCUT_PREFERENCES[action],
        }));
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

        setShortcuts((currentShortcuts) => ({
          ...currentShortcuts,
          [action]: normalizedShortcut,
        }));

        return { ok: true };
      },
    }),
    [globalShortcutError, setShortcuts, shortcuts],
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
