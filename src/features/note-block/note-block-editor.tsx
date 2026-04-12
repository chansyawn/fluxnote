import { useMutation } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";
import { useDebouncedCallback } from "use-debounce";

import { queryClient } from "@/app/query";
import { type Block, updateBlockContent } from "@/clients";
import { NoteBlockEditorView } from "@/features/note-block/note-block-editor-view";

interface NoteBlockEditorProps {
  block: Block;
  focusRequestKey: number;
  isDeleting: boolean;
  isOnlyBlock: boolean;
  onDelete: (blockId: string) => Promise<void>;
  onFocus: (blockId: string) => void;
  tagAction?: ReactNode;
}

function updateBlockInCache(updatedBlock: Block): void {
  queryClient.setQueriesData<Block[]>({ queryKey: ["blocks"] }, (current) => {
    if (!current) {
      return current;
    }

    return current.map((block) => (block.id === updatedBlock.id ? updatedBlock : block));
  });
}

export function NoteBlockEditor({
  block,
  focusRequestKey,
  isDeleting,
  isOnlyBlock,
  onDelete,
  onFocus,
  tagAction,
}: NoteBlockEditorProps) {
  const latestContentRef = useRef(block.content);
  const persistedContentRef = useRef(block.content);
  const latestRequestIdRef = useRef(0);
  const appliedRequestIdRef = useRef(0);

  useEffect(() => {
    latestContentRef.current = block.content;
    persistedContentRef.current = block.content;
    latestRequestIdRef.current = 0;
    appliedRequestIdRef.current = 0;
  }, [block.id, block.content]);

  const saveMutation = useMutation({
    mutationFn: async ({ content, requestId }: { content: string; requestId: number }) => ({
      requestId,
      updatedBlock: await updateBlockContent({
        blockId: block.id,
        content,
      }),
    }),
  });

  const handleSaveSuccess = useEffectEvent(
    ({ requestId, updatedBlock }: { requestId: number; updatedBlock: Block }) => {
      if (requestId < appliedRequestIdRef.current) {
        return;
      }

      appliedRequestIdRef.current = requestId;
      persistedContentRef.current = updatedBlock.content;
      updateBlockInCache(updatedBlock);
    },
  );

  const handleSaveError = useEffectEvent(() => {
    // Save errors are intentionally silent in the simplified MVP UI.
  });

  const runSave = useEffectEvent((content: string) => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    void saveMutation
      .mutateAsync({ content, requestId })
      .then(handleSaveSuccess)
      .catch(handleSaveError);
  });

  const debouncedSave = useDebouncedCallback(
    (content: string) => {
      runSave(content);
    },
    600,
    { flushOnExit: true },
  );

  const handleMarkdownUpdated = useEffectEvent((markdown: string) => {
    latestContentRef.current = markdown;

    if (markdown === persistedContentRef.current) {
      debouncedSave.cancel();
      return;
    }

    debouncedSave(markdown);
  });

  const flushPendingSave = useEffectEvent(() => {
    debouncedSave.flush();
  });

  return (
    <NoteBlockEditorView
      blockId={block.id}
      focusRequestKey={focusRequestKey}
      initialMarkdown={block.content}
      isDeleting={isDeleting}
      isOnlyBlock={isOnlyBlock}
      onBlur={flushPendingSave}
      onMarkdownUpdated={handleMarkdownUpdated}
      tagAction={tagAction}
      onDelete={() => {
        void onDelete(block.id);
      }}
      onFocus={() => {
        onFocus(block.id);
      }}
    />
  );
}
