import { queryClient } from "@renderer/app/query";
import { useOpenBlockRequest } from "@renderer/features/open-block/open-block-request-context";
import { useEffect } from "react";

import { isBlockNavigationCancelledError } from "./navigation/use-block-navigation";

interface UseOpenBlockNavigationParams {
  navigateToBlock: (blockId: string) => Promise<void>;
}

export function useOpenBlockNavigation({ navigateToBlock }: UseOpenBlockNavigationParams): void {
  const { acknowledgePendingBlockId, pendingTarget } = useOpenBlockRequest();

  useEffect(() => {
    if (!pendingTarget) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ["blocks"] });

    void (async () => {
      try {
        await navigateToBlock(pendingTarget.blockId);
      } catch (error) {
        if (!isBlockNavigationCancelledError(error)) {
          console.warn("Failed to open requested block", error);
        }
      } finally {
        acknowledgePendingBlockId(pendingTarget.blockId);
      }
    })();
  }, [acknowledgePendingBlockId, navigateToBlock, pendingTarget]);
}
