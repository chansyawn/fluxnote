import { queryClient } from "@renderer/app/query";
import { type Block, type ListBlocksResult, updateBlockContent } from "@renderer/clients";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

interface BlockPersistence {
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

export function useBlockPersistence(block: Block): BlockPersistence {
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
      updatedBlock: await updateBlockContent({ blockId: block.id, content }),
    }),
  });

  const runSave = useCallback(
    (content: string) => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;

      const savePromise = saveContent({ content, requestId })
        .then(({ requestId: appliedId, updatedBlock }) => {
          // Out-of-order responses keep the latest applied id; ties pass to honor "last write wins".
          if (appliedId < appliedRequestIdRef.current) return;
          appliedRequestIdRef.current = appliedId;
          persistedContentRef.current = updatedBlock.content;
          updateBlockInCache(updatedBlock.id, () => updatedBlock);
        })
        .catch(() => {
          // Save errors are intentionally silent in the simplified MVP UI.
        });
      savePromiseRef.current = savePromise;
      void savePromise.finally(() => {
        if (savePromiseRef.current === savePromise) {
          savePromiseRef.current = null;
        }
      });
    },
    [saveContent],
  );

  const getLatestContent = useCallback(() => latestContentRef.current, []);

  const snapshotLatestContent = useCallback(() => {
    if (latestContentRef.current === persistedContentRef.current) return;
    const blockId = block.id;
    const content = latestContentRef.current;
    updateBlockInCache(blockId, (current) => ({ ...current, content }));
  }, [block.id]);

  const saveMarkdown = useCallback(
    (markdown: string) => {
      latestContentRef.current = markdown;
      if (markdown === persistedContentRef.current) return;
      runSave(markdown);
    },
    [runSave],
  );

  const waitForPendingSave = useCallback(async () => {
    await savePromiseRef.current;
  }, []);

  return { getLatestContent, saveMarkdown, snapshotLatestContent, waitForPendingSave };
}
