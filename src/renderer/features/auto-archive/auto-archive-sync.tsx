import { queryClient } from "@renderer/app/query";
import { onAutoArchiveStateChanged } from "@renderer/clients/event";
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
    const unlistenFocusChanged = onWindowFocusChanged((focused) => {
      if (!focused) {
        return;
      }

      invalidateBlockQueries();
    });
    return () => {
      unlistenStateChanged();
      unlistenFocusChanged();
    };
  }, []);

  return null;
}
