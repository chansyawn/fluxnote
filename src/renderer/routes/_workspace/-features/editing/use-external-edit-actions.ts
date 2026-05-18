import { queryClient } from "@renderer/app/query";
import {
  cancelExternalEdit,
  submitExternalEdit,
  type ListBlocksResult,
  toAppInvokeError,
} from "@renderer/clients";
import type { PersistedBlockEditorHandle } from "@renderer/features/block";
import { normalizeExternalMarkdown } from "@renderer/features/block-editor/markdown/external-markdown";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface UseExternalEditActionsParams {
  getEditor: (blockId: string) => PersistedBlockEditorHandle | undefined;
  navigateToBlock?: (blockId: string) => void;
}

interface UseExternalEditActionsResult {
  pendingExternalEditIds: Set<string>;
  handleCancelExternalEdit: (editId: string) => Promise<void>;
  handleSubmitExternalEdit: (blockId: string, editId: string) => Promise<void>;
}

export function useExternalEditActions({
  getEditor,
  navigateToBlock,
}: UseExternalEditActionsParams): UseExternalEditActionsResult {
  const [pendingExternalEditIds, setPendingExternalEditIds] = useState<Set<string>>(
    () => new Set(),
  );

  const handleCancelExternalEdit = useCallback(async (editId: string) => {
    setPendingExternalEditIds((current) => new Set(current).add(editId));
    try {
      await cancelExternalEdit({ editId });
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    } catch (error) {
      toast.error(toAppInvokeError(error).message);
    } finally {
      setPendingExternalEditIds((current) => {
        const next = new Set(current);
        next.delete(editId);
        return next;
      });
    }
  }, []);

  const handleSubmitExternalEdit = useCallback(
    async (blockId: string, editId: string) => {
      setPendingExternalEditIds((current) => new Set(current).add(editId));
      try {
        const editorContent = await getEditor(blockId)?.flush();
        let content = editorContent;
        if (content === undefined) {
          for (const [, cached] of queryClient.getQueriesData<ListBlocksResult>({
            queryKey: ["blocks"],
          })) {
            const found = cached?.blocks.find((b) => b.id === blockId);
            if (found) {
              content = found.content;
              break;
            }
          }
        }
        if (content === undefined) {
          toast.error("Cannot submit: block content unavailable.");
          return;
        }
        await submitExternalEdit({ content: normalizeExternalMarkdown(content), editId });
        void queryClient.invalidateQueries({ queryKey: ["blocks"] });
        navigateToBlock?.(blockId);
      } catch (error) {
        toast.error(toAppInvokeError(error).message);
      } finally {
        setPendingExternalEditIds((current) => {
          const next = new Set(current);
          next.delete(editId);
          return next;
        });
      }
    },
    [getEditor, navigateToBlock],
  );

  return {
    pendingExternalEditIds,
    handleCancelExternalEdit,
    handleSubmitExternalEdit,
  };
}
