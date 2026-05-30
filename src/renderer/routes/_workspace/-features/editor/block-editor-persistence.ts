import { type Block, updateBlockContent } from "@renderer/clients";
import { useAsyncDebouncer } from "@tanstack/react-pacer";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { patchWorkspaceBlock } from "../block-collection/workspace-block-cache";

const BLOCK_EDITOR_SAVE_DEBOUNCE_MS = 500;

interface BlockPersistence {
  getLatestContent: () => string;
  flushSave: () => Promise<void>;
  saveMarkdown: (markdown: string) => void;
}

export function useBlockEditorPersistence(block: Block): BlockPersistence {
  const latestContentRef = useRef(block.content);
  const persistedContentRef = useRef(block.content);
  const blockRef = useRef(block);
  const activeSavePromiseRef = useRef<Promise<void> | null>(null);
  const pendingSaveContentRef = useRef<string | null>(null);

  useEffect(() => {
    blockRef.current = block;
  }, [block]);

  useEffect(() => {
    latestContentRef.current = block.content;
    persistedContentRef.current = block.content;
    activeSavePromiseRef.current = null;
    pendingSaveContentRef.current = null;
  }, [block.id]);

  const { mutateAsync: saveContent } = useMutation({
    mutationFn: async ({ blockId, content }: { blockId: string; content: string }) =>
      await updateBlockContent({ blockId, content }),
  });

  const startSave = useCallback(
    (content: string): Promise<void> => {
      const savePromise: Promise<void> = saveContent({
        blockId: blockRef.current.id,
        content,
      })
        .then((updatedBlock) => {
          persistedContentRef.current = updatedBlock.content;
          patchWorkspaceBlock(updatedBlock);
        })
        .catch(() => {
          // Save errors are intentionally silent in the simplified MVP UI.
        })
        .then(() => {
          if (activeSavePromiseRef.current === savePromise) {
            activeSavePromiseRef.current = null;
          }

          const pendingContent = pendingSaveContentRef.current;
          pendingSaveContentRef.current = null;
          if (pendingContent === null || pendingContent === persistedContentRef.current) {
            return;
          }

          return startSave(pendingContent);
        });
      activeSavePromiseRef.current = savePromise;
      return savePromise;
    },
    [saveContent],
  );

  const saveLatest = useCallback(
    (content: string) => {
      if (activeSavePromiseRef.current) {
        pendingSaveContentRef.current = content;
        return activeSavePromiseRef.current;
      }

      if (content === persistedContentRef.current) {
        return Promise.resolve();
      }

      return startSave(content);
    },
    [startSave],
  );

  const saveDebouncer = useAsyncDebouncer(
    async () => {
      await saveLatest(latestContentRef.current);
      return true;
    },
    {
      onError: () => undefined,
      onUnmount: (debouncer) => {
        void debouncer.flush();
      },
      throwOnError: false,
      wait: BLOCK_EDITOR_SAVE_DEBOUNCE_MS,
    },
  );

  const getLatestContent = useCallback(() => latestContentRef.current, []);

  const flushSave = useCallback(async () => {
    const didFlushPendingSave = await saveDebouncer.flush();
    if (!didFlushPendingSave) {
      await saveLatest(latestContentRef.current);
    }
  }, [saveDebouncer, saveLatest]);

  const saveMarkdown = useCallback(
    (markdown: string) => {
      latestContentRef.current = markdown;
      if (!activeSavePromiseRef.current && markdown === persistedContentRef.current) return;
      void saveDebouncer.maybeExecute();
    },
    [saveDebouncer],
  );

  return { getLatestContent, flushSave, saveMarkdown };
}
