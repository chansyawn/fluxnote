import { normalizeExternalMarkdown } from "@fluxnotes/editor";
import { toast } from "@fluxnotes/ui/components/sonner";
import {
  cancelExternalEdit,
  submitExternalEdit,
  toAppInvokeError,
  type ExternalEditSession,
} from "@renderer/clients";
import { refreshBlocks } from "@renderer/features/blocks/block-query";
import { useCallback, useMemo, useState } from "react";

import { getCachedWorkspaceBlock } from "../block-collection/workspace-block-cache";
import type { WorkspaceBlockEditorHandle } from "../editor/workspace-block-editor-surface";

interface UseExternalEditSubmissionParams {
  getEditor: (blockId: string) => WorkspaceBlockEditorHandle | undefined;
  navigateToBlock?: (blockId: string) => Promise<void>;
}

interface UseExternalEditSubmissionResult {
  pendingExternalEditIds: Set<string>;
  handleCancelExternalEdit: (id: string) => Promise<void>;
  handleSubmitExternalEdit: (
    blockId: string,
    id: string,
    session?: ExternalEditSession,
  ) => Promise<void>;
}

export function useExternalEditSubmission({
  getEditor,
  navigateToBlock,
}: UseExternalEditSubmissionParams): UseExternalEditSubmissionResult {
  const [pendingExternalEditIds, setPendingExternalEditIds] = useState<Set<string>>(
    () => new Set(),
  );

  const markPending = useCallback((id: string) => {
    setPendingExternalEditIds((current) => new Set(current).add(id));
  }, []);

  const unmarkPending = useCallback((id: string) => {
    setPendingExternalEditIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const getSubmittableMarkdown = useCallback(
    async (blockId: string) => {
      const editorContent = await getEditor(blockId)?.flush();
      const content = editorContent ?? getCachedWorkspaceBlock(blockId)?.content;
      return content === undefined ? null : normalizeExternalMarkdown(content);
    },
    [getEditor],
  );

  const handleCancelExternalEdit = useCallback(
    async (id: string) => {
      markPending(id);
      try {
        await cancelExternalEdit({ id });
        refreshBlocks();
      } catch (error) {
        toast.error(toAppInvokeError(error).message);
      } finally {
        unmarkPending(id);
      }
    },
    [markPending, unmarkPending],
  );

  const copyBlockContent = useCallback(
    async (blockId: string) => {
      try {
        await getEditor(blockId)?.copy();
      } catch (error) {
        toast.error(toAppInvokeError(error).message);
      }
    },
    [getEditor],
  );

  const handleSubmitExternalEdit = useCallback(
    async (blockId: string, id: string, session?: ExternalEditSession) => {
      markPending(id);
      try {
        if (session?.submission.transport === "clipboard") {
          await copyBlockContent(blockId);
        }
        const content = await getSubmittableMarkdown(blockId);
        if (content === null) {
          toast.error("Cannot submit: block content unavailable.");
          return;
        }
        await submitExternalEdit({ content, id });
        refreshBlocks();
        void navigateToBlock?.(blockId).catch(() => undefined);
      } catch (error) {
        toast.error(toAppInvokeError(error).message);
      } finally {
        unmarkPending(id);
      }
    },
    [copyBlockContent, getSubmittableMarkdown, markPending, navigateToBlock, unmarkPending],
  );

  return useMemo(
    () => ({
      pendingExternalEditIds,
      handleCancelExternalEdit,
      handleSubmitExternalEdit,
    }),
    [handleCancelExternalEdit, handleSubmitExternalEdit, pendingExternalEditIds],
  );
}
