import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

interface DeepLinkPayload {
  blockId: string;
}

interface UseDeepLinkResult {
  pendingBlockId: string | null;
  clearPendingBlockId: () => void;
}

export function useDeepLink(): UseDeepLinkResult {
  const [pendingBlockId, setPendingBlockId] = useState<string | null>(null);

  useEffect(() => {
    const unlistenPromise = listen<DeepLinkPayload>("deep-link://open-block", (event) => {
      console.log("Deep link event received:", event.payload);
      setPendingBlockId(event.payload.blockId);
    });

    return () => {
      unlistenPromise
        .then((unlisten) => unlisten())
        .catch((error) => {
          console.error("Failed to unlisten deep link event:", error);
        });
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
