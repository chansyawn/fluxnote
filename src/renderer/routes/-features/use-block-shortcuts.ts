import type { Block } from "@renderer/clients";
import type { NoteBlockEditorHandle } from "@renderer/features/note-block/note-block-editor";
import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import { matchShortcutEvent } from "@renderer/features/shortcut/shortcut-utils";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";

interface UseBlockShortcutsParams {
  blocks: Block[];
  createBlock: () => Promise<Block>;
  deleteBlock: (blockId: string) => Promise<void>;
  scrollToBlock: (blockId: string) => void;
}

interface UseBlockShortcutsResult {
  editorRefs: React.RefObject<Map<string, NoteBlockEditorHandle>>;
  registerEditorRef: (blockId: string, handle: NoteBlockEditorHandle | null) => void;
  createBlockWithFocus: () => Promise<void>;
  deleteBlockWithFocus: (blockId: string) => Promise<void>;
  setActiveBlockId: (blockId: string) => void;
  requestBlockFocus: (blockId: string) => void;
}

function getAdjacentBlockId(blocks: Block[], blockId: string): string | null {
  const currentIndex = blocks.findIndex((block) => block.id === blockId);

  if (currentIndex === -1) {
    return null;
  }

  return blocks[currentIndex - 1]?.id ?? blocks[currentIndex + 1]?.id ?? null;
}

export function useBlockShortcuts({
  blocks,
  createBlock,
  deleteBlock,
  scrollToBlock,
}: UseBlockShortcutsParams): UseBlockShortcutsResult {
  const { shortcuts } = useShortcutState();
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const editorRefs = useRef<Map<string, NoteBlockEditorHandle>>(new Map());
  const pendingFocusBlockIdRef = useRef<string | null>(null);

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

  const requestBlockFocus = useEffectEvent((blockId: string | null) => {
    if (!blockId) {
      return;
    }

    pendingFocusBlockIdRef.current = blockId;
    scrollToBlock(blockId);
    setActiveBlockId(blockId);
    setTimeout(attemptPendingFocus, 0);
  });

  const createBlockWithFocus = useEffectEvent(async () => {
    const newBlock = await createBlock();
    requestBlockFocus(newBlock.id);
  });

  const deleteBlockWithFocus = useEffectEvent(async (blockId: string) => {
    const shouldMoveFocus = activeBlockId === blockId;
    const nextFocusBlockId = shouldMoveFocus ? getAdjacentBlockId(blocks, blockId) : null;

    await deleteBlock(blockId);

    if (!shouldMoveFocus) {
      return;
    }

    if (!nextFocusBlockId) {
      setActiveBlockId(null);
      return;
    }

    requestBlockFocus(nextFocusBlockId);
  });

  useEffect(() => {
    if (!activeBlockId) {
      return;
    }

    const hasActiveBlock = blocks.some((block) => block.id === activeBlockId);

    if (!hasActiveBlock) {
      setActiveBlockId(null);
    }
  }, [activeBlockId, blocks]);

  useEffect(() => {
    const pendingBlockId = pendingFocusBlockIdRef.current;
    if (!pendingBlockId) return;

    const exists = blocks.some((block) => block.id === pendingBlockId);
    if (!exists) {
      pendingFocusBlockIdRef.current = null;
      return;
    }

    scrollToBlock(pendingBlockId);
  }, [blocks, scrollToBlock]);

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
  };
}
