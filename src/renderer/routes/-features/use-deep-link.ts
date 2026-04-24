import { onDeepLinkOpenBlock } from "@renderer/clients/event";
import { useEffect, useState } from "react";

interface UseDeepLinkResult {
  pendingBlockId: string | null;
  clearPendingBlockId: () => void;
}

export function useDeepLink(): UseDeepLinkResult {
  const [pendingBlockId, setPendingBlockId] = useState<string | null>(null);

  useEffect(() => {
    const unlisten = onDeepLinkOpenBlock((payload) => {
      setPendingBlockId(payload.blockId);
    });

    return () => {
      unlisten();
    };
  }, []);

  const clearPendingBlockId = () => {
    setPendingBlockId(null);
  };

  return {
    pendingBlockId,
    clearPendingBlockId,
  };
}
