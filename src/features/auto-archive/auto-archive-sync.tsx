import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";

import { queryClient } from "@/app/query";

const AUTO_ARCHIVE_STATE_CHANGED_EVENT = "auto-archive://state-changed";
const appWindow = getCurrentWindow();

export function AutoArchiveSync() {
  useEffect(() => {
    let isDisposed = false;

    const invalidateBlockQueries = () => {
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    };

    const setupListeners = async () => {
      const unlistenStateChanged = await listen(AUTO_ARCHIVE_STATE_CHANGED_EVENT, () => {
        invalidateBlockQueries();
      });
      const unlistenFocusChanged = await appWindow.onFocusChanged(({ payload: focused }) => {
        if (!focused) {
          return;
        }

        invalidateBlockQueries();
      });

      if (isDisposed) {
        unlistenStateChanged();
        unlistenFocusChanged();
        return;
      }

      return () => {
        unlistenStateChanged();
        unlistenFocusChanged();
      };
    };

    const cleanupPromise = setupListeners();

    return () => {
      isDisposed = true;
      void cleanupPromise.then((cleanup) => {
        cleanup?.();
      });
    };
  }, []);

  return null;
}
