import { queryClient } from "@renderer/app/query";
import { useOpenBlockRequest } from "@renderer/features/open-block/open-block-request-context";
import { useEffect } from "react";

import type { BlockNavigationOptions } from "./navigation/use-block-navigation";

interface UseOpenBlockNavigationParams {
  navigateToBlock: (blockId: string, options?: BlockNavigationOptions) => void;
}

export function useOpenBlockNavigation({ navigateToBlock }: UseOpenBlockNavigationParams): void {
  const { acknowledgePendingBlockId, pendingTarget } = useOpenBlockRequest();

  useEffect(() => {
    if (!pendingTarget) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ["blocks"] });

    navigateToBlock(pendingTarget.blockId, {
      acknowledge: () => {
        acknowledgePendingBlockId(pendingTarget.blockId);
      },
      onNotFound: () => undefined,
      viewMode: "active-unfiltered",
    });
  }, [acknowledgePendingBlockId, navigateToBlock, pendingTarget]);
}
