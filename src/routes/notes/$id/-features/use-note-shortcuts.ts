import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { NoteBlock, NoteDetail } from "@/clients";
import { useShortcutState } from "@/features/shortcut/shortcut-state";
import { matchShortcutEvent } from "@/features/shortcut/shortcut-utils";

interface UseNoteShortcutsParams {
  noteDetail: NoteDetail | null;
  createBlock: (noteId: string) => Promise<NoteBlock>;
  deleteBlock: (blockId: string) => Promise<void>;
}

interface FocusRequest {
  blockId: string;
  requestKey: number;
}

interface UseNoteShortcutsResult {
  focusRequest: FocusRequest | null;
  createBlockWithFocus: () => Promise<void>;
  deleteBlockWithFocus: (blockId: string) => Promise<void>;
  setActiveBlockId: (blockId: string) => void;
}

function getAdjacentBlockId(blocks: NoteDetail["blocks"], blockId: string): string | null {
  const currentIndex = blocks.findIndex((block) => block.id === blockId);

  if (currentIndex === -1) {
    return null;
  }

  return blocks[currentIndex - 1]?.id ?? blocks[currentIndex + 1]?.id ?? null;
}

export function useNoteShortcuts({
  noteDetail,
  createBlock,
  deleteBlock,
}: UseNoteShortcutsParams): UseNoteShortcutsResult {
  const { shortcuts } = useShortcutState();
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const focusRequestCounterRef = useRef(0);

  const requestBlockFocus = useEffectEvent((blockId: string | null) => {
    if (!blockId) {
      return;
    }

    focusRequestCounterRef.current += 1;
    setFocusRequest({
      blockId,
      requestKey: focusRequestCounterRef.current,
    });
    setActiveBlockId(blockId);
  });

  const createBlockWithFocus = useEffectEvent(async () => {
    if (!noteDetail) {
      return;
    }

    const newBlock = await createBlock(noteDetail.note.id);
    requestBlockFocus(newBlock.id);
  });

  const deleteBlockWithFocus = useEffectEvent(async (blockId: string) => {
    if (!noteDetail || noteDetail.blocks.length === 1) {
      return;
    }

    const shouldMoveFocus = activeBlockId === blockId;
    const nextFocusBlockId = shouldMoveFocus
      ? getAdjacentBlockId(noteDetail.blocks, blockId)
      : null;

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

    if (!noteDetail) {
      setActiveBlockId(null);
      return;
    }

    const hasActiveBlock = noteDetail.blocks.some((block) => block.id === activeBlockId);

    if (!hasActiveBlock) {
      setActiveBlockId(null);
    }
  }, [activeBlockId, noteDetail]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !activeBlockId || !noteDetail) {
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

      if (noteDetail.blocks.length === 1) {
        return;
      }

      void deleteBlockWithFocus(activeBlockId);
    };

    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [activeBlockId, createBlockWithFocus, deleteBlockWithFocus, noteDetail, shortcuts]);

  return {
    focusRequest,
    createBlockWithFocus,
    deleteBlockWithFocus,
    setActiveBlockId,
  };
}
