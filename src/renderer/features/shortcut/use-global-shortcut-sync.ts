import {
  registerGlobalShortcut,
  unregisterGlobalShortcut,
} from "@renderer/features/shortcut/global-shortcut-sync";
import {
  normalizeShortcutBinding,
  type ShortcutBinding,
} from "@renderer/features/shortcut/shortcut-utils";
import { useEffect, useEffectEvent, useRef, useState } from "react";

interface UseGlobalShortcutSyncOptions {
  shortcut: ShortcutBinding;
  onPressed: () => void;
}

export function useGlobalShortcutSync(options: UseGlobalShortcutSyncOptions): ShortcutBinding {
  const { onPressed, shortcut } = options;
  const [errorShortcut, setErrorShortcut] = useState<ShortcutBinding>(null);
  const syncTokenRef = useRef(0);
  const handlePressed = useEffectEvent(onPressed);

  useEffect(() => {
    let isMounted = true;
    const syncToken = ++syncTokenRef.current;
    const normalizedShortcut = normalizeShortcutBinding(shortcut ?? "");
    const isCurrentSync = () => isMounted && syncTokenRef.current === syncToken;

    setErrorShortcut(null);

    const syncShortcut = async () => {
      if (!normalizedShortcut) {
        return;
      }

      const result = await registerGlobalShortcut({
        shortcut: normalizedShortcut,
        onPressed: handlePressed,
      });

      if (!isCurrentSync()) {
        return;
      }

      if (result.type === "registered") {
        setErrorShortcut(null);
        return;
      }

      if (result.type === "recoverable-error") {
        console.warn(
          "Global shortcut registration reported an error but shortcut is active",
          result.error,
        );
        setErrorShortcut(null);
        return;
      }

      console.error("Failed to register global shortcut", result.error);
      setErrorShortcut(normalizedShortcut);
    };

    void syncShortcut();

    return () => {
      isMounted = false;

      if (!normalizedShortcut) {
        return;
      }

      void unregisterGlobalShortcut(normalizedShortcut);
    };
  }, [handlePressed, shortcut]);

  return errorShortcut;
}
