import { queryClient } from "@renderer/app/query";
import { type Block, type ListBlocksResult, updateBlockContent } from "@renderer/clients";
import { NoteBlockEditorView } from "@renderer/features/note-block/note-block-editor-view";
import { type NoteEditorShellHandle } from "@renderer/features/note-editor-core";
import { useDebouncer } from "@tanstack/react-pacer";
import { useMutation } from "@tanstack/react-query";
import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  type ReactNode,
  type Ref,
} from "react";

interface NoteBlockEditorProps {
  block: Block;
  actions?: ReactNode;
  isExternalEditPending?: boolean;
  leadingActions?: ReactNode;
  onFocus: (blockId: string) => void;
  ref?: Ref<NoteBlockEditorHandle>;
}

export interface NoteBlockEditorHandle extends NoteEditorShellHandle {
  getLatestMarkdown: () => Promise<string>;
}

function updateBlockInCache(updatedBlock: Block): void {
  queryClient.setQueriesData<ListBlocksResult>({ queryKey: ["blocks"] }, (current) => {
    if (!current) {
      return current;
    }

    return {
      ...current,
      blocks: current.blocks.map((block) => (block.id === updatedBlock.id ? updatedBlock : block)),
    };
  });
}

export function NoteBlockEditor({
  block,
  actions,
  isExternalEditPending = false,
  leadingActions,
  onFocus,
  ref,
}: NoteBlockEditorProps) {
  const editorShellRef = useRef<NoteEditorShellHandle | null>(null);
  const blockIdRef = useRef(block.id);
  blockIdRef.current = block.id;
  const latestContentRef = useRef(block.content);
  const persistedContentRef = useRef(block.content);
  const latestRequestIdRef = useRef(0);
  const appliedRequestIdRef = useRef(0);
  const savePromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    latestContentRef.current = block.content;
    persistedContentRef.current = block.content;
    latestRequestIdRef.current = 0;
    appliedRequestIdRef.current = 0;
    savePromiseRef.current = null;
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

    const savePromise = saveMutation
      .mutateAsync({ content, requestId })
      .then(handleSaveSuccess)
      .catch(handleSaveError);
    savePromiseRef.current = savePromise;
    void savePromise.finally(() => {
      if (savePromiseRef.current === savePromise) {
        savePromiseRef.current = null;
      }
    });
  });

  const saveDebouncer = useDebouncer(
    (content: string) => {
      runSave(content);
    },
    {
      wait: 600,
      onUnmount: (debouncer) => {
        debouncer.flush();
      },
    },
  );

  useEffect(() => {
    return () => {
      if (latestContentRef.current !== persistedContentRef.current) {
        const id = blockIdRef.current;
        const content = latestContentRef.current;
        queryClient.setQueriesData<ListBlocksResult>({ queryKey: ["blocks"] }, (current) => {
          if (!current) return current;
          return {
            ...current,
            blocks: current.blocks.map((b) => (b.id === id ? { ...b, content } : b)),
          };
        });
      }
      saveDebouncer.flush();
    };
  }, [saveDebouncer]);

  const handleMarkdownUpdated = useEffectEvent((markdown: string) => {
    latestContentRef.current = markdown;

    if (markdown === persistedContentRef.current) {
      saveDebouncer.cancel();
      return;
    }

    saveDebouncer.maybeExecute(markdown);
  });

  const flushPendingSave = useEffectEvent(() => {
    saveDebouncer.flush();
  });

  const getLatestMarkdown = useEffectEvent(async () => {
    saveDebouncer.flush();
    await savePromiseRef.current;
    return latestContentRef.current;
  });

  useImperativeHandle(ref, () => ({
    copy: async () => {
      await editorShellRef.current?.copy();
    },
    getLatestMarkdown,
    focus: () => {
      editorShellRef.current?.focus();
    },
  }));

  return (
    <NoteBlockEditorView
      blockId={block.id}
      ref={editorShellRef}
      initialMarkdown={block.content}
      isExternalEditPending={isExternalEditPending}
      leadingActions={leadingActions}
      willArchive={block.willArchive}
      actions={actions}
      onBlur={flushPendingSave}
      onMarkdownUpdated={handleMarkdownUpdated}
      onFocus={() => {
        onFocus(block.id);
      }}
    />
  );
}
