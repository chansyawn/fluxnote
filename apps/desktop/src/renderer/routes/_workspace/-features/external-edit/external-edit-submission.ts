import { toast } from "@fluxnotes/ui/components/sonner";
import {
  cancelExternalEdit,
  submitExternalEdit,
  toAppInvokeError,
  type ExternalEditSession,
} from "@renderer/clients";
import { refreshBlocks } from "@renderer/features/blocks/block-query";
import { useCallback, useState } from "react";

import type { WorkspaceBlockEditorHandle } from "../editor/workspace-block-editor-surface";
import type { SubmittableBlockContent } from "./submittable-block-content";

interface UseExternalEditSubmissionParams {
  getEditor: (blockId: string) => WorkspaceBlockEditorHandle | undefined;
  submittableBlockContent: SubmittableBlockContent;
  navigateToBlock?: (blockId: string) => Promise<void>;
}

interface ExternalEditSubmission {
  pendingExternalEditIds: Set<string>;
  cancelExternalEdit: (editId: string) => Promise<void>;
  submitExternalEdit: (
    blockId: string,
    editId: string,
    session?: ExternalEditSession,
  ) => Promise<void>;
}

export function useExternalEditSubmission({
  getEditor,
  submittableBlockContent,
  navigateToBlock,
}: UseExternalEditSubmissionParams): ExternalEditSubmission {
  const [pendingExternalEditIds, setPendingExternalEditIds] = useState<Set<string>>(
    () => new Set(),
  );

  const markPending = useCallback((editId: string) => {
    setPendingExternalEditIds((current) => new Set(current).add(editId));
  }, []);

  const unmarkPending = useCallback((editId: string) => {
    setPendingExternalEditIds((current) => {
      const next = new Set(current);
      next.delete(editId);
      return next;
    });
  }, []);

  const handleCancelExternalEdit = useCallback(
    async (editId: string) => {
      markPending(editId);
      try {
        await cancelExternalEdit({ editId });
        refreshBlocks();
      } catch (error) {
        toast.error(toAppInvokeError(error).message);
      } finally {
        unmarkPending(editId);
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
    async (blockId: string, editId: string, session?: ExternalEditSession) => {
      markPending(editId);
      try {
        if (
          session?.trigger.source === "mac_accessibility" &&
          session.trigger.mode === "copy_only"
        ) {
          await copyBlockContent(blockId);
        }
        const content = await submittableBlockContent.getSubmittableMarkdown(blockId);
        if (content === null) {
          toast.error("Cannot submit: block content unavailable.");
          return;
        }
        await submitExternalEdit({ content, editId });
        refreshBlocks();
        void navigateToBlock?.(blockId).catch(() => undefined);
      } catch (error) {
        toast.error(toAppInvokeError(error).message);
      } finally {
        unmarkPending(editId);
      }
    },
    [copyBlockContent, markPending, navigateToBlock, submittableBlockContent, unmarkPending],
  );

  return {
    pendingExternalEditIds,
    cancelExternalEdit: handleCancelExternalEdit,
    submitExternalEdit: handleSubmitExternalEdit,
  };
}
