import {
  acknowledgePendingOpenBlock,
  onOpenBlockRequested,
  readPendingOpenBlock,
  type OpenBlockRequestedPayload,
} from "@renderer/clients";
import { useCallback, useEffect, useState } from "react";

interface UseOpenBlockRequestResult {
  acknowledgePendingBlockId: (blockId: string) => void;
  pendingTarget: OpenBlockRequestedPayload | null;
}

export function useOpenBlockRequest(): UseOpenBlockRequestResult {
  const [pendingTarget, setPendingTarget] = useState<OpenBlockRequestedPayload | null>(null);

  useEffect(() => {
    let active = true;
    const unlisten = onOpenBlockRequested((payload) => {
      setPendingTarget(payload);
    });
    void readPendingOpenBlock()
      .then((pending) => {
        if (active && pending.target) {
          setPendingTarget(pending.target);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
      unlisten();
    };
  }, []);

  const acknowledgePendingBlockId = useCallback((blockId: string) => {
    setPendingTarget((currentTarget) =>
      currentTarget?.blockId === blockId ? null : currentTarget,
    );
    void acknowledgePendingOpenBlock(blockId).catch(() => undefined);
  }, []);

  return {
    acknowledgePendingBlockId,
    pendingTarget,
  };
}
