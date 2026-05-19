import {
  onAutoArchiveStateChanged,
  onExternalEditSessionsChanged,
  onWindowFocusChanged,
} from "@renderer/clients";
import { refreshBlocks } from "@renderer/features/blocks/block-query";
import { useEffect } from "react";

export function AutoArchiveSync() {
  useEffect(() => {
    const unlistenStateChanged = onAutoArchiveStateChanged(() => {
      refreshBlocks();
    });
    const unlistenExternalEditSessionsChanged = onExternalEditSessionsChanged(() => {
      refreshBlocks();
    });
    const unlistenFocusChanged = onWindowFocusChanged((focused) => {
      if (!focused) {
        return;
      }

      refreshBlocks();
    });
    return () => {
      unlistenStateChanged();
      unlistenExternalEditSessionsChanged();
      unlistenFocusChanged();
    };
  }, []);

  return null;
}
