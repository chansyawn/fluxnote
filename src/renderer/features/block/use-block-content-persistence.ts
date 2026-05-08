import { queryClient } from "@renderer/app/query";
import { type Block, type ListBlocksResult, updateBlockContent } from "@renderer/clients";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

interface BlockContentPersistence {
  getLatestContent: () => string;
  saveMarkdown: (markdown: string) => void;
  snapshotLatestContent: () => void;
  waitForPendingSave: () => Promise<void>;
}

function updateBlockInCache(blockId: string, updateBlock: (block: Block) => Block): void {
  queryClient.setQueriesData<ListBlocksResult>({ queryKey: ["blocks"] }, (current) => {
    if (!current) {
      return current;
    }

    return {
      ...current,
      blocks: current.blocks.map((block) => (block.id === blockId ? updateBlock(block) : block)),
    };
  });
}

function replaceBlockInCache(updatedBlock: Block): void {
  updateBlockInCache(updatedBlock.id, () => updatedBlock);
}

function updateBlockContentInCache(blockId: string, content: string): void {
  updateBlockInCache(blockId, (block) => ({ ...block, content }));
}

export function useBlockContentPersistence(block: Block): BlockContentPersistence {
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

  const { mutateAsync: saveContent } = useMutation({
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
      replaceBlockInCache(updatedBlock);
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

      const savePromise = saveContent({ content, requestId })
        .then(handleSaveSuccess)
        .catch(handleSaveError);
      savePromiseRef.current = savePromise;
      void savePromise.finally(() => {
        if (savePromiseRef.current === savePromise) {
          savePromiseRef.current = null;
        }
      });
    },
    [handleSaveError, handleSaveSuccess, saveContent],
  );

  const getLatestContent = useCallback(() => latestContentRef.current, []);

  const snapshotLatestContent = useCallback(() => {
    if (latestContentRef.current === persistedContentRef.current) {
      return;
    }

    updateBlockContentInCache(blockIdRef.current, latestContentRef.current);
  }, []);

  const saveMarkdown = useCallback(
    (markdown: string) => {
      latestContentRef.current = markdown;

      if (markdown === persistedContentRef.current) {
        return;
      }

      runSave(markdown);
    },
    [runSave],
  );

  const waitForPendingSave = useCallback(async () => {
    await savePromiseRef.current;
  }, []);

  return {
    getLatestContent,
    saveMarkdown,
    snapshotLatestContent,
    waitForPendingSave,
  };
}
