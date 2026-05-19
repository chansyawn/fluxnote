import { useCallback, useEffectEvent, useMemo } from "react";

interface UseActiveBlockFocusParams {
  activeBlockId: string | null;
  setActiveBlockId: (blockId: string | null) => void;
}

export interface ActiveBlockFocus {
  activeBlockId: string | null;
  focusBlock: (blockId: string | null) => void;
  isActiveBlockEditorFocused: () => boolean;
}

export function useActiveBlockFocus({
  activeBlockId,
  setActiveBlockId,
}: UseActiveBlockFocusParams): ActiveBlockFocus {
  const focusBlock = useCallback(
    (blockId: string | null) => {
      setActiveBlockId(blockId);
    },
    [setActiveBlockId],
  );

  const isActiveBlockEditorFocused = useEffectEvent(() => {
    if (!activeBlockId) {
      return false;
    }

    const focusedBlockEditor = document.activeElement?.closest<HTMLElement>("[data-block-id]");
    return focusedBlockEditor?.dataset.blockId === activeBlockId;
  });

  return useMemo(
    () => ({
      activeBlockId,
      focusBlock,
      isActiveBlockEditorFocused,
    }),
    [activeBlockId, focusBlock, isActiveBlockEditorFocused],
  );
}
