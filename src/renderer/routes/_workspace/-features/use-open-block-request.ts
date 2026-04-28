import {
  acknowledgePendingOpenBlock,
  onOpenBlockRequested,
  readPendingOpenBlock,
} from "@renderer/clients/open-block";
import { useCallback, useEffect, useState } from "react";

interface UseOpenBlockRequestResult {
  acknowledgePendingBlockId: (blockId: string) => void;
  pendingBlockId: string | null;
}

export function useOpenBlockRequest(): UseOpenBlockRequestResult {
  const [pendingBlockId, setPendingBlockId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unlisten = onOpenBlockRequested((payload) => {
      setPendingBlockId(payload.blockId);
    });
    void readPendingOpenBlock()
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
    void acknowledgePendingOpenBlock(blockId).catch(() => undefined);
  }, []);

  return {
    acknowledgePendingBlockId,
    pendingBlockId,
  };
}
