import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { ShortcutBinding } from "@/app/preferences/preferences-schema";
import {
  registerGlobalShortcut,
  unregisterGlobalShortcut,
} from "@/features/shortcut/global-shortcut-sync";
import { normalizeShortcut } from "@/features/shortcut/shortcut-utils";

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
    const normalizedShortcut = normalizeShortcut(shortcut ?? "");
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
