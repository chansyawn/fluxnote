import type { BlockVisibility, LocateBlockResult } from "@renderer/clients";
import { locateBlock } from "@renderer/clients";
import { useEffect, useEffectEvent } from "react";
import { toast } from "sonner";

/**
 * Resolves a fresh locate result into the navigation status used by the route effect.
 * Extracted as a pure async function so it can be tested independently.
 */
export async function resolveLocatedBlock(
  blockId: string,
  locate: () => Promise<LocateBlockResult>,
): Promise<{ status: "found"; blockId: string; index: number } | { status: "not_found" }> {
  const result = await locate();
  return result && result.block.id === blockId
    ? { status: "found", blockId: result.block.id, index: result.index }
    : { status: "not_found" };
}

interface UseOpenBlockTargetOptions {
  pendingBlockId: string | null;
  onSetVisibility: (visibility: BlockVisibility) => void;
  onClearFilters: () => void;
  onFocus: (blockId: string, index: number) => void;
  onAcknowledge: (blockId: string) => void;
}

/**
 * Manages the full lifecycle of navigating to a pending open-block request.
 *
 * When pendingBlockId arrives, resets filter state then asks the backend for the block's active
 * list index. That keeps deep jumps working even when the target page has not been loaded.
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
      const result = await resolveLocatedBlock(blockId, () =>
        locateBlock({ blockId, visibility: "active" }),
      );

      if (isCancelled()) return;

      if (result.status === "found") {
        onAcknowledge(blockId);
        setTimeout(() => {
          if (!isCancelled()) {
            onFocus(result.blockId, result.index);
          }
        }, 0);
        return;
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
