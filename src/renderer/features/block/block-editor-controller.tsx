import { queryClient } from "@renderer/app/query";
import { type Block, type ListBlocksResult, updateBlockContent } from "@renderer/clients";
import { type BlockEditorHandle } from "@renderer/features/block-editor";
import { BlockEditorView } from "@renderer/features/block/block-editor-view";
import { useDebouncer } from "@tanstack/react-pacer";
import { useMutation } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactNode,
  type Ref,
} from "react";

interface BlockEditorControllerProps {
  block: Block;
  actions?: ReactNode;
  isExternalEditPending?: boolean;
  leadingActions?: ReactNode;
  onFocus: (blockId: string) => void;
  ref?: Ref<BlockEditorControllerHandle>;
}

export interface BlockEditorControllerHandle extends BlockEditorHandle {
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

export function BlockEditorController({
  block,
  actions,
  isExternalEditPending = false,
  leadingActions,
  onFocus,
  ref,
}: BlockEditorControllerProps) {
  const editorShellRef = useRef<BlockEditorHandle | null>(null);
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

  const handleSaveSuccess = useCallback(
    ({ requestId, updatedBlock }: { requestId: number; updatedBlock: Block }) => {
      if (requestId < appliedRequestIdRef.current) {
        return;
      }

      appliedRequestIdRef.current = requestId;
      persistedContentRef.current = updatedBlock.content;
      updateBlockInCache(updatedBlock);
    },
    [],
  );

  const handleSaveError = useCallback(() => {
    // Save errors are intentionally silent in the simplified MVP UI.
  }, []);

  const runSave = useCallback(
    (content: string) => {
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
    },
    [handleSaveError, handleSaveSuccess, saveMutation],
  );

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

  const handleMarkdownUpdated = useCallback(
    (markdown: string) => {
      latestContentRef.current = markdown;

      if (markdown === persistedContentRef.current) {
        saveDebouncer.cancel();
        return;
      }

      saveDebouncer.maybeExecute(markdown);
    },
    [saveDebouncer],
  );

  const flushPendingSave = useCallback(() => {
    saveDebouncer.flush();
  }, [saveDebouncer]);

  const getLatestMarkdown = useCallback(async () => {
    saveDebouncer.flush();
    await savePromiseRef.current;
    return latestContentRef.current;
  }, [saveDebouncer]);

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
    <BlockEditorView
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
