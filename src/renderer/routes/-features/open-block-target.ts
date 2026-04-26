import { queryClient } from "@renderer/app/query";
import type { Block, BlockVisibility } from "@renderer/clients";
import { listBlocks } from "@renderer/clients";
import { blockListQueryKey } from "@renderer/features/note-block/note-query-key";
import { useEffect, useEffectEvent } from "react";
import { toast } from "sonner";

/**
 * Fetches a fresh active-blocks list and returns whether the given block exists.
 * Extracted as a pure async function so it can be tested independently.
 */
export async function locateBlock(
  blockId: string,
  fetchBlocks: () => Promise<Block[]>,
): Promise<"found" | "not_found"> {
  const blocks = await fetchBlocks();
  return blocks.some((block) => block.id === blockId) ? "found" : "not_found";
}

interface UseOpenBlockTargetOptions {
  pendingBlockId: string | null;
  onSetVisibility: (visibility: BlockVisibility) => void;
  onClearFilters: () => void;
  onFocus: (blockId: string) => void;
  onAcknowledge: (blockId: string) => void;
}

/**
 * Manages the full lifecycle of navigating to a pending open-block request.
 *
 * When pendingBlockId arrives, resets filter state then fetches a fresh active-blocks list via
 * fetchQuery. The existence check runs against that fresh data, eliminating the race condition
 * where invalidateQueries was called but isRefreshing had not yet become true.
 *
 * Callbacks are wrapped in useEffectEvent so inline functions passed by callers do not cause
 * the effect to re-run on every render.
 */
export function useOpenBlockTarget({
  pendingBlockId,
  onSetVisibility,
  onClearFilters,
  onFocus,
  onAcknowledge,
}: UseOpenBlockTargetOptions): void {
  const locate = useEffectEvent(async (blockId: string, isCancelled: () => boolean) => {
    onSetVisibility("active");
    onClearFilters();

    try {
      const result = await locateBlock(blockId, () =>
        queryClient.fetchQuery({
          queryKey: blockListQueryKey([], "active"),
          queryFn: () => listBlocks({ visibility: "active" }),
          staleTime: 0, // bypass the global 30s staleTime to always fetch fresh data
        }),
      );

      if (isCancelled()) return;

      if (result === "found") {
        onFocus(blockId);
      } else {
        toast.error("Block not found", {
          description: "The requested block does not exist or has been archived.",
        });
      }
    } catch {
      if (isCancelled()) return;
      toast.error("Failed to locate block");
    }

    onAcknowledge(blockId);
  });

  useEffect(() => {
    if (!pendingBlockId) return;

    let cancelled = false;
    void locate(pendingBlockId, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [pendingBlockId]);
}
