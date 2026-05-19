import { cancelExternalEdit, submitExternalEdit, toAppInvokeError } from "@renderer/clients";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { refreshWorkspaceBlocks } from "../block-collection/workspace-block-collection";
import type { BlockContentSource } from "./block-content-source";

interface UseExternalEditSubmissionParams {
  blockContentSource: BlockContentSource;
  navigateToBlock?: (blockId: string) => Promise<void>;
}

interface ExternalEditSubmission {
  pendingExternalEditIds: Set<string>;
  cancelExternalEdit: (editId: string) => Promise<void>;
  submitExternalEdit: (blockId: string, editId: string) => Promise<void>;
}

export function useExternalEditSubmission({
  blockContentSource,
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
        refreshWorkspaceBlocks();
      } catch (error) {
        toast.error(toAppInvokeError(error).message);
      } finally {
        unmarkPending(editId);
      }
    },
    [markPending, unmarkPending],
  );

  const handleSubmitExternalEdit = useCallback(
    async (blockId: string, editId: string) => {
      markPending(editId);
      try {
        const content = await blockContentSource.getSubmittableMarkdown(blockId);
        if (content === null) {
          toast.error("Cannot submit: block content unavailable.");
          return;
        }
        await submitExternalEdit({ content, editId });
        refreshWorkspaceBlocks();
        void navigateToBlock?.(blockId).catch(() => undefined);
      } catch (error) {
        toast.error(toAppInvokeError(error).message);
      } finally {
        unmarkPending(editId);
      }
    },
    [blockContentSource, markPending, navigateToBlock, unmarkPending],
  );

  return {
    pendingExternalEditIds,
    cancelExternalEdit: handleCancelExternalEdit,
    submitExternalEdit: handleSubmitExternalEdit,
  };
}
