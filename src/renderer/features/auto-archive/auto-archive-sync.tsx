import { queryClient } from "@renderer/app/query";
import {
  onAutoArchiveStateChanged,
  onExternalEditSessionsChanged,
  onWindowFocusChanged,
} from "@renderer/clients";
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
