import { queryClient } from "@renderer/app/query";
import { onAutoArchiveStateChanged } from "@renderer/clients/event";
import { onExternalEditSessionsChanged } from "@renderer/clients/external-edits";
import { onWindowFocusChanged } from "@renderer/clients/window";
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
