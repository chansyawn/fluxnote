import type { Block, LocateBlockResult } from "@renderer/clients";
import type { NoteBlockEditorHandle } from "@renderer/features/note-block/note-block-editor";
import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import { matchShortcutEvent } from "@renderer/features/shortcut/shortcut-utils";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";

interface UseBlockShortcutsParams {
  loadedBlocks: Block[];
  totalBlockCount: number;
  createBlock: () => Promise<Block>;
  deleteBlock: (blockId: string) => Promise<void>;
  getBlockAtIndex: (index: number) => Block | undefined;
  ensureBlockIndexLoaded: (index: number) => Promise<void>;
  locateBlockInView: (blockId: string) => Promise<LocateBlockResult>;
  scrollToBlockIndex: (index: number) => void;
}

interface UseBlockShortcutsResult {
  editorRefs: React.RefObject<Map<string, NoteBlockEditorHandle>>;
  registerEditorRef: (blockId: string, handle: NoteBlockEditorHandle | null) => void;
  createBlockWithFocus: () => Promise<void>;
  deleteBlockWithFocus: (blockId: string) => Promise<void>;
  setActiveBlockId: (blockId: string) => void;
  requestBlockFocus: (blockId: string) => void;
  requestLocatedBlockFocus: (blockId: string, index: number) => void;
}

export function useBlockShortcuts({
  loadedBlocks,
  totalBlockCount,
  createBlock,
  deleteBlock,
  getBlockAtIndex,
  ensureBlockIndexLoaded,
  locateBlockInView,
  scrollToBlockIndex,
}: UseBlockShortcutsParams): UseBlockShortcutsResult {
  const { shortcuts } = useShortcutState();
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const editorRefs = useRef<Map<string, NoteBlockEditorHandle>>(new Map());
  const pendingFocusBlockIdRef = useRef<string | null>(null);
  const pendingFocusIndexRef = useRef<number | null>(null);

  const attemptPendingFocus = useCallback(() => {
    const blockId = pendingFocusBlockIdRef.current;
    if (!blockId) return;

    const editor = editorRefs.current.get(blockId);
    if (!editor) return;

    pendingFocusBlockIdRef.current = null;
    editor.focus();
  }, []);

  const registerEditorRef = useCallback(
    (blockId: string, handle: NoteBlockEditorHandle | null) => {
      if (handle) {
        editorRefs.current.set(blockId, handle);
        if (pendingFocusBlockIdRef.current === blockId) {
          setTimeout(attemptPendingFocus, 0);
        }
        return;
      }

      editorRefs.current.delete(blockId);
    },
    [attemptPendingFocus],
  );

  const requestLocatedBlockFocus = useEffectEvent((blockId: string | null, index: number) => {
    if (!blockId) {
      return;
    }

    pendingFocusBlockIdRef.current = blockId;
    pendingFocusIndexRef.current = null;
    setActiveBlockId(blockId);
    scrollToBlockIndex(index);
    attemptPendingFocus();
    void ensureBlockIndexLoaded(index).then(() => {
      scrollToBlockIndex(index);
      attemptPendingFocus();
    });
  });

  const requestBlockFocus = useEffectEvent((blockId: string | null) => {
    if (!blockId) {
      return;
    }

    pendingFocusBlockIdRef.current = blockId;
    void locateBlockInView(blockId).then((result) => {
      if (!result) {
        pendingFocusBlockIdRef.current = null;
        return;
      }

      requestLocatedBlockFocus(result.block.id, result.index);
    });
  });

  const requestBlockFocusAtIndex = useEffectEvent((index: number) => {
    if (index < 0) {
      setActiveBlockId(null);
      return;
    }

    const block = getBlockAtIndex(index);
    if (block) {
      requestLocatedBlockFocus(block.id, index);
      return;
    }

    pendingFocusIndexRef.current = index;
    scrollToBlockIndex(index);
    void ensureBlockIndexLoaded(index).then(() => {
      scrollToBlockIndex(index);
      attemptPendingIndexFocus();
    });
  });

  const attemptPendingIndexFocus = useEffectEvent(() => {
    const index = pendingFocusIndexRef.current;
    if (index === null) {
      return;
    }

    const block = getBlockAtIndex(index);
    if (!block) {
      return;
    }

    pendingFocusIndexRef.current = null;
    requestLocatedBlockFocus(block.id, index);
  });

  const createBlockWithFocus = useEffectEvent(async () => {
    const newBlock = await createBlock();
    requestBlockFocus(newBlock.id);
  });

  const deleteBlockWithFocus = useEffectEvent(async (blockId: string) => {
    const shouldMoveFocus = activeBlockId === blockId;
    const currentLocation = shouldMoveFocus ? await locateBlockInView(blockId) : null;
    const countBeforeDelete = totalBlockCount;

    await deleteBlock(blockId);

    if (!shouldMoveFocus) {
      return;
    }

    if (!currentLocation || countBeforeDelete <= 1) {
      setActiveBlockId(null);
      return;
    }

    const nextIndex =
      currentLocation.index >= countBeforeDelete - 1
        ? currentLocation.index - 1
        : currentLocation.index;
    requestBlockFocusAtIndex(nextIndex);
  });

  useEffect(() => {
    attemptPendingIndexFocus();
    attemptPendingFocus();
  }, [attemptPendingFocus, attemptPendingIndexFocus, loadedBlocks]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !activeBlockId) {
        return;
      }

      const focusedBlockEditor =
        document.activeElement?.closest<HTMLElement>("[data-note-block-id]");

      if (!focusedBlockEditor || focusedBlockEditor.dataset.noteBlockId !== activeBlockId) {
        return;
      }

      if (matchShortcutEvent(event, shortcuts["create-block"])) {
        event.preventDefault();
        event.stopPropagation();
        void createBlockWithFocus();
        return;
      }

      if (!matchShortcutEvent(event, shortcuts["delete-block"])) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void deleteBlockWithFocus(activeBlockId);
    };

    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [activeBlockId, createBlockWithFocus, deleteBlockWithFocus, shortcuts]);

  return {
    editorRefs,
    registerEditorRef,
    createBlockWithFocus,
    deleteBlockWithFocus,
    setActiveBlockId,
    requestBlockFocus,
    requestLocatedBlockFocus,
  };
}
