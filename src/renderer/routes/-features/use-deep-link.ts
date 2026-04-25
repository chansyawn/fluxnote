import {
  acknowledgePendingDeepLink,
  onDeepLinkOpenBlock,
  readPendingDeepLink,
} from "@renderer/clients/deep-link";
import { useCallback, useEffect, useState } from "react";

interface UseDeepLinkResult {
  acknowledgePendingBlockId: (blockId: string) => void;
  pendingBlockId: string | null;
}

export function useDeepLink(): UseDeepLinkResult {
  const [pendingBlockId, setPendingBlockId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unlisten = onDeepLinkOpenBlock((payload) => {
      setPendingBlockId(payload.blockId);
    });
    void readPendingDeepLink()
      .then((pending) => {
        if (active && pending.blockId) {
          setPendingBlockId(pending.blockId);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
      unlisten();
    };
  }, []);

  const acknowledgePendingBlockId = useCallback((blockId: string) => {
    setPendingBlockId((currentBlockId) => (currentBlockId === blockId ? null : currentBlockId));
    void acknowledgePendingDeepLink(blockId).catch(() => undefined);
  }, []);

  return {
    acknowledgePendingBlockId,
    pendingBlockId,
  };
}
