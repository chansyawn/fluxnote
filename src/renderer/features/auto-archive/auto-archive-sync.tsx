import { queryClient } from "@renderer/app/query";
import { onExternalEditSessionsChanged } from "@renderer/features/external-edit/external-edit-api";
import { onAutoArchiveStateChanged } from "@renderer/features/ipc/events-api";
import { onWindowFocusChanged } from "@renderer/features/window/window-api";
import { useEffect } from "react";

export function AutoArchiveSync() {
  useEffect(() => {
    const invalidateBlockQueries = () => {
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    };

    const unlistenStateChanged = onAutoArchiveStateChanged(() => {
      invalidateBlockQueries();
    });
    const unlistenExternalEditSessionsChanged = onExternalEditSessionsChanged(() => {
      invalidateBlockQueries();
    });
    const unlistenFocusChanged = onWindowFocusChanged((focused) => {
      if (!focused) {
        return;
      }

      invalidateBlockQueries();
    });
    return () => {
      unlistenStateChanged();
      unlistenExternalEditSessionsChanged();
      unlistenFocusChanged();
    };
  }, []);

  return null;
}
